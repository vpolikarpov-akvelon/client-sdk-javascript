import {
  CacheClient,
  DefaultMomentoLoggerFactory,
  DefaultMomentoLoggerLevel,
  MomentoLogger,
  MomentoLoggerFactory,
} from '@gomomento/sdk';
import {range} from './utils/collections';
import {delay} from './utils/time';
import {
  BasicLoadGenContext,
  BasicLoadGenOptions,
  executeRequestAndUpdateContextCounts,
  initiateLoadGenContext,
} from './utils/load-gen';
import {getElapsedMillis, logStats} from './utils/load-gen-statistics-calculator';
import {createCache, getCacheClient} from './utils/cache';

class BasicLoadGen {
  private readonly loggerFactory: MomentoLoggerFactory;
  private readonly logger: MomentoLogger;
  private readonly cacheItemTtlSeconds = 60;
  private readonly options: BasicLoadGenOptions;
  private readonly delayMillisBetweenRequests: number;
  private readonly cacheValue: string;

  private readonly cacheName: string = 'js-loadgen';

  constructor(options: BasicLoadGenOptions) {
    this.loggerFactory = options.loggerFactory;
    this.logger = this.loggerFactory.getLogger('load-gen');
    this.options = options;
    this.cacheValue = 'x'.repeat(options.cacheItemPayloadBytes);
    this.delayMillisBetweenRequests =
      (1000.0 * this.options.numberOfConcurrentRequests) / this.options.maxRequestsPerSecond;
  }

  async run(): Promise<void> {
    const momento = getCacheClient(this.loggerFactory, this.options.requestTimeoutMs, this.cacheItemTtlSeconds);

    await createCache(momento, this.cacheName, this.logger);

    this.logger.trace(`delayMillisBetweenRequests: ${this.delayMillisBetweenRequests}`);

    this.logger.info(`Limiting to ${this.options.maxRequestsPerSecond} tps`);
    this.logger.info(`Running ${this.options.numberOfConcurrentRequests} concurrent requests`);
    this.logger.info(`Running for ${this.options.totalSecondsToRun} seconds`);

    const loadGenContext = initiateLoadGenContext();

    const asyncGetSetResults = range(this.options.numberOfConcurrentRequests).map(workerId =>
      this.launchAndRunWorkers(momento, loadGenContext, workerId + 1)
    );

    // Show stats periodically.
    const logStatsIntervalId = setInterval(() => {
      logStats(loadGenContext, this.logger, this.options.maxRequestsPerSecond);
    }, this.options.showStatsIntervalSeconds * 1000);

    await Promise.all(asyncGetSetResults);

    // We're done, stop showing stats.
    clearInterval(logStatsIntervalId);

    // Show the stats one last time at the end.
    logStats(loadGenContext, this.logger, this.options.maxRequestsPerSecond);

    this.logger.info('DONE!');
    // wait a few millis to allow the logger to finish flushing
    await delay(500);
  }

  private async launchAndRunWorkers(
    client: CacheClient,
    loadGenContext: BasicLoadGenContext,
    workerId: number
  ): Promise<void> {
    let finished = false;
    const finish = () => (finished = true);
    setTimeout(finish, this.options.totalSecondsToRun * 1000);

    let i = 1;
    for (;;) {
      await this.issueAsyncSetGet(client, loadGenContext, workerId, i);

      if (finished) {
        return;
      }

      i++;
    }
  }

  private async issueAsyncSetGet(
    client: CacheClient,
    loadGenContext: BasicLoadGenContext,
    workerId: number,
    operationId: number
  ): Promise<void> {
    const cacheKey = `worker${workerId}operation${operationId}`;

    const setStartTime = process.hrtime();
    const result = await executeRequestAndUpdateContextCounts(this.logger, loadGenContext, () =>
      client.set(this.cacheName, cacheKey, this.cacheValue)
    );
    if (result !== undefined) {
      const setDuration = getElapsedMillis(setStartTime);
      loadGenContext.setLatencies.recordValue(setDuration);
      if (setDuration < this.delayMillisBetweenRequests) {
        const delayMs = this.delayMillisBetweenRequests - setDuration;
        this.logger.trace(`delaying: ${delayMs}`);
        await delay(delayMs);
      }
    }

    const getStartTime = process.hrtime();
    const getResult = await executeRequestAndUpdateContextCounts(this.logger, loadGenContext, () =>
      client.get(this.cacheName, cacheKey)
    );

    if (getResult !== undefined) {
      const getDuration = getElapsedMillis(getStartTime);
      loadGenContext.getLatencies.recordValue(getDuration);
      if (getDuration < this.delayMillisBetweenRequests) {
        const delayMs = this.delayMillisBetweenRequests - getDuration;
        this.logger.trace(`delaying: ${delayMs}`);
        await delay(delayMs);
      }
    }
  }
}

const PERFORMANCE_INFORMATION_MESSAGE = `
Thanks for trying out our basic node.js load generator!  This tool is
included to allow you to experiment with performance in your environment
based on different configurations.  It's very simplistic, and only intended
to give you a quick way to explore the performance of the Momento client
running on a single nodejs process.

Note that because nodejs javascript code runs on a single thread, the limiting
factor in request throughput will often be CPU.  Keep an eye on your CPU
consumption while running the load generator, and if you reach 100%
of a CPU core then you most likely won't be able to improve throughput further
without running additional nodejs processes.

CPU will also impact your client-side latency; as you increase the number of
concurrent requests, if they are competing for CPU time then the observed
latency will increase.

Also, since performance will be impacted by network latency, you'll get the best
results if you run on a cloud VM in the same region as your Momento cache.

Check out the configuration settings at the bottom of the 'load-gen.ts' to
see how different configurations impact performance.

If you have questions or need help experimenting further, please reach out to us!
`;

async function main(loadGeneratorOptions: BasicLoadGenOptions) {
  const loadGenerator = new BasicLoadGen(loadGeneratorOptions);
  await loadGenerator.run();
}

const loadGeneratorOptions: BasicLoadGenOptions = {
  /**
   * This setting allows you to control the verbosity of the log output during
   * the load generator run.
   */
  loggerFactory: new DefaultMomentoLoggerFactory(
    /**
     * Available log levels are trace, debug, info, warn, and error.
     */
    DefaultMomentoLoggerLevel.DEBUG
  ),
  /** Print some statistics about throughput and latency every time this many
   *  seconds have passed.
   */
  showStatsIntervalSeconds: 5,
  /**
   * Configures the Momento client to timeout if a request exceeds this limit.
   * Momento client default is 5 seconds.
   */
  requestTimeoutMs: 15 * 1000,
  /**
   * Controls the size of the payload that will be used for the cache items in
   * the load test.  Smaller payloads will generally provide lower latencies than
   * larger payloads.
   */
  cacheItemPayloadBytes: 100,
  /**
   * Sets an upper bound on how many requests per second will be sent to the server.
   * Momento caches have a default throttling limit of 100 requests per second,
   * so if you raise this, you may observe throttled requests.  Contact
   * support@momentohq.com to inquire about raising your limits.
   */
  maxRequestsPerSecond: 100,
  /**
   * Controls the number of concurrent requests that will be made (via asynchronous
   * function calls) by the load test.  Increasing this number may improve throughput,
   * but it will also increase CPU consumption.  As CPU usage increases and there
   * is more contention between the concurrent function calls, client-side latencies
   * may increase.
   */
  numberOfConcurrentRequests: 10,
  /**
   * Controls how long the load test will run, in milliseconds. We will execute operations
   * for this long and the exit.
   */
  totalSecondsToRun: 60,
};

main(loadGeneratorOptions)
  .then(() => {
    console.log('success!!');
    console.log(PERFORMANCE_INFORMATION_MESSAGE);
  })
  .catch((e: Error) => {
    console.error(`Uncaught exception while running load gen: ${e.message}`);
    throw e;
  });
