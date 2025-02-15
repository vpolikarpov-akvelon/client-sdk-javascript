import {InvalidArgumentError} from '../../errors';
import {decodeFromBase64, encodeToBase64} from './string';

export function validateCacheName(name: string) {
  if (isEmpty(name)) {
    throw new InvalidArgumentError('cache name must not be empty');
  }
}

export function validateSetName(name: string) {
  if (isEmpty(name)) {
    throw new InvalidArgumentError('set name must not be empty');
  }
}

export function validateSortedSetName(name: string) {
  if (isEmpty(name)) {
    throw new InvalidArgumentError('sorted set name must not be empty');
  }
}

export function validateSortedSetRanks(start_rank: number, end_rank?: number) {
  if (end_rank === undefined) {
    return;
  }
  if (start_rank > 0 && end_rank > 0 && start_rank > end_rank) {
    throw new InvalidArgumentError('start rank must be less than end rank');
  }
  if (start_rank < 0 && end_rank < 0 && start_rank >= end_rank) {
    throw new InvalidArgumentError(
      'negative start rank must be less than negative end rank'
    );
  }
}

export function validateSortedSetScores(minScore?: number, maxScore?: number) {
  if (minScore === undefined) return;
  if (maxScore === undefined) return;
  if (minScore > maxScore) {
    throw new InvalidArgumentError(
      'minScore must be less than or equal to maxScore'
    );
  }
}

export function validateSortedSetOffset(offset: number) {
  if (offset < 0) {
    throw new InvalidArgumentError('offset must be non-negative (>= 0)');
  }
}

export function validateSortedSetCount(count: number) {
  if (count < 1) {
    throw new InvalidArgumentError('count must be strictly positive (> 0)');
  }
}

export function validateDictionaryName(name: string) {
  if (isEmpty(name)) {
    throw new InvalidArgumentError('dictionary name must not be empty');
  }
}

export function validateListName(name: string) {
  if (isEmpty(name)) {
    throw new InvalidArgumentError('list name must not be empty');
  }
}

export function validateListSliceStartEnd(
  startIndex?: number,
  endIndex?: number
) {
  if (startIndex === undefined || endIndex === undefined) return;
  // can't validate bounds for start and index of either or are negative without list length
  if (startIndex > 0 || endIndex < 0) return;
  if (endIndex <= startIndex) {
    throw new InvalidArgumentError(
      'endIndex (exclusive) must be larger than startIndex (inclusive)'
    );
  }
}

export function validateTopicName(name: string) {
  if (isEmpty(name)) {
    throw new InvalidArgumentError('topic name must not be empty');
  }
}

export function validateTtlMinutes(ttlMinutes: number) {
  if (ttlMinutes < 0) {
    throw new InvalidArgumentError('ttlMinutes must be positive');
  }
}

export function validateValidForSeconds(validForSeconds: number) {
  if (validForSeconds < 0) {
    throw new InvalidArgumentError('validForSeconds must be positive');
  }
}

function isEmpty(str: string): boolean {
  return !str.trim();
}

export function isBase64(str: string): boolean {
  try {
    return encodeToBase64(decodeFromBase64(str)) === str;
  } catch (e) {
    return false;
  }
}
