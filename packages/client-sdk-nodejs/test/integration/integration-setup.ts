import {CacheClientProps} from '../../src/cache-client-props';
import {testCacheName} from '@gomomento/common-integration-tests';
import {
  AuthClient,
  CreateCache,
  Configurations,
  DeleteCache,
  MomentoErrorCode,
  CacheClient,
  CredentialProvider,
  CollectionTtl,
  TopicClient,
} from '../../src';
import {ICacheClient} from '@gomomento/sdk-core/dist/src/clients/ICacheClient';
export const deleteCacheIfExists = async (
  momento: CacheClient,
  cacheName: string
) => {
  const deleteResponse = await momento.deleteCache(cacheName);
  if (deleteResponse instanceof DeleteCache.Error) {
    if (deleteResponse.errorCode() !== MomentoErrorCode.NOT_FOUND_ERROR) {
      throw deleteResponse.innerException();
    }
  }
};

export async function WithCache(
  client: CacheClient,
  cacheName: string,
  block: () => Promise<void>
) {
  await deleteCacheIfExists(client, cacheName);
  await client.createCache(cacheName);
  try {
    await block();
  } finally {
    await deleteCacheIfExists(client, cacheName);
  }
}

const credsProvider = CredentialProvider.fromEnvironmentVariable({
  environmentVariableName: 'TEST_AUTH_TOKEN',
});

export const IntegrationTestCacheClientProps: CacheClientProps = {
  configuration: Configurations.Laptop.latest(),
  credentialProvider: credsProvider,
  defaultTtlSeconds: 1111,
};

function momentoClientForTesting(): CacheClient {
  return new CacheClient(IntegrationTestCacheClientProps);
}

function momentoClientForTestingWithSessionToken(): CacheClient {
  const credentialProvider = CredentialProvider.fromEnvironmentVariable({
    environmentVariableName: 'TEST_SESSION_TOKEN',
    // session tokens don't include cache/control endpoints, so we must provide them.  In this case we just hackily
    // steal them from the auth-token-based creds provider.
    cacheEndpoint: credsProvider.getCacheEndpoint(),
    controlEndpoint: credsProvider.getControlEndpoint(),
  });
  return new CacheClient({
    configuration: Configurations.Laptop.latest(),
    credentialProvider: credentialProvider,
    defaultTtlSeconds: 1111,
  });
}

function momentoTopicClientForTesting(): TopicClient {
  return new TopicClient({
    configuration: IntegrationTestCacheClientProps.configuration,
    credentialProvider: IntegrationTestCacheClientProps.credentialProvider,
  });
}

export function SetupIntegrationTest(): {
  Momento: CacheClient;
  IntegrationTestCacheName: string;
} {
  const cacheName = testCacheName();

  beforeAll(async () => {
    // Use a fresh client to avoid test interference with setup.
    const momento = momentoClientForTesting();
    await deleteCacheIfExists(momento, cacheName);
    const createResponse = await momento.createCache(cacheName);
    if (createResponse instanceof CreateCache.Error) {
      throw createResponse.innerException();
    }
  });

  afterAll(async () => {
    // Use a fresh client to avoid test interference with teardown.
    const momento = momentoClientForTesting();
    const deleteResponse = await momento.deleteCache(cacheName);
    if (deleteResponse instanceof DeleteCache.Error) {
      throw deleteResponse.innerException();
    }
  });

  const client = momentoClientForTesting();
  return {Momento: client, IntegrationTestCacheName: cacheName};
}

export function SetupTopicIntegrationTest(): {
  topicClient: TopicClient;
  Momento: CacheClient;
  IntegrationTestCacheName: string;
} {
  const {Momento, IntegrationTestCacheName} = SetupIntegrationTest();
  const topicClient = momentoTopicClientForTesting();
  return {topicClient, Momento, IntegrationTestCacheName};
}

export function SetupAuthClientIntegrationTest(): {
  sessionTokenAuthClient: AuthClient;
  legacyTokenAuthClient: AuthClient;
  authTokenAuthClientFactory: (authToken: string) => AuthClient;
  cacheClientFactory: (token: string) => ICacheClient;
  cacheName: string;
} {
  const cacheName = testCacheName();

  beforeAll(async () => {
    // Use a fresh client to avoid test interference with setup.
    const momento = momentoClientForTestingWithSessionToken();
    await deleteCacheIfExists(momento, cacheName);
    const createResponse = await momento.createCache(cacheName);
    if (createResponse instanceof CreateCache.Error) {
      throw createResponse.innerException();
    }
  });

  afterAll(async () => {
    // Use a fresh client to avoid test interference with teardown.
    const momento = momentoClientForTestingWithSessionToken();
    const deleteResponse = await momento.deleteCache(cacheName);
    if (deleteResponse instanceof DeleteCache.Error) {
      throw deleteResponse.innerException();
    }
  });

  return {
    sessionTokenAuthClient: new AuthClient({
      credentialProvider: CredentialProvider.fromEnvironmentVariable({
        environmentVariableName: 'TEST_SESSION_TOKEN',
        // session tokens don't include cache/control endpoints, so we must provide them.  In this case we just hackily
        // steal them from the auth-token-based creds provider.
        cacheEndpoint: credsProvider.getCacheEndpoint(),
        controlEndpoint: credsProvider.getControlEndpoint(),
      }),
    }),
    legacyTokenAuthClient: new AuthClient({
      credentialProvider: CredentialProvider.fromEnvironmentVariable({
        environmentVariableName: 'TEST_LEGACY_AUTH_TOKEN',
      }),
    }),
    authTokenAuthClientFactory: authToken => {
      return new AuthClient({
        credentialProvider: CredentialProvider.fromString({
          authToken: authToken,
        }),
      });
    },

    cacheClientFactory: authToken =>
      new CacheClient({
        credentialProvider: CredentialProvider.fromString({
          authToken: authToken,
        }),
        configuration: Configurations.Laptop.latest(),
        defaultTtlSeconds: 60,
      }),
    cacheName: cacheName,
  };
}

export interface ValidateCacheProps {
  cacheName: string;
}

export interface ValidateSortedSetProps extends ValidateCacheProps {
  sortedSetName: string;
  value: string | Uint8Array;
}

export interface ValidateSortedSetChangerProps extends ValidateSortedSetProps {
  score: number;
  ttl?: CollectionTtl;
}

export function delay(ms: number): Promise<unknown> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
