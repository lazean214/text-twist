import type { LeaderboardMetric, LeaderboardRow, PlayerProfile } from '../types/player'

type ProfileStore = {
  version: 1
  activeProfileId: string | null
  profiles: PlayerProfile[]
}

type ParsedStoreResult = {
  store: ProfileStore
  corrupted: boolean
}

const STORAGE_KEY = 'text-twist:profiles:v1'

const EMPTY_STORE: ProfileStore = {
  version: 1,
  activeProfileId: null,
  profiles: [],
}

function isValidProfile(profile: unknown): profile is PlayerProfile {
  if (!profile || typeof profile !== 'object') {
    return false
  }

  const candidate = profile as Partial<PlayerProfile>

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.createdAt === 'number' &&
    typeof candidate.lastPlayedAt === 'number' &&
    typeof candidate.currentLevel === 'number' &&
    typeof candidate.totalScore === 'number' &&
    Array.isArray(candidate.usedWords) &&
    typeof candidate.bestSingleRoundScore === 'number'
  )
}

function toProfileWithDefaults(profile: PlayerProfile): PlayerProfile {
  return {
    ...profile,
    bestTimeRaceSeconds:
      typeof profile.bestTimeRaceSeconds === 'number'
        ? profile.bestTimeRaceSeconds
        : null,
  }
}

function parseStore(raw: string | null): ParsedStoreResult {
  if (!raw) {
    return {
      store: EMPTY_STORE,
      corrupted: false,
    }
  }

  try {
    const parsed = JSON.parse(raw) as Partial<ProfileStore>

    if (parsed.version !== 1 || !Array.isArray(parsed.profiles)) {
      return {
        store: EMPTY_STORE,
        corrupted: true,
      }
    }

    const validProfiles = parsed.profiles
      .filter((profile) => isValidProfile(profile))
      .map((profile) => toProfileWithDefaults(profile))

    const store: ProfileStore = {
      version: 1,
      activeProfileId:
        typeof parsed.activeProfileId === 'string'
          ? parsed.activeProfileId
          : null,
      profiles: validProfiles,
    }

    const corrupted =
      validProfiles.length !== parsed.profiles.length

    return {
      store,
      corrupted,
    }
  } catch {
    return {
      store: EMPTY_STORE,
      corrupted: true,
    }
  }
}

function readStore(): ProfileStore {
  return parseStore(window.localStorage.getItem(STORAGE_KEY)).store
}

function writeStore(store: ProfileStore) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

function now() {
  return Date.now()
}

function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, ' ')
}

export function listProfiles(): PlayerProfile[] {
  const store = readStore()
  return [...store.profiles].sort(
    (a, b) => b.lastPlayedAt - a.lastPlayedAt,
  )
}

export function getActiveProfile(): PlayerProfile | null {
  const store = readStore()

  if (!store.activeProfileId) {
    return null
  }

  return (
    store.profiles.find(
      (profile) => profile.id === store.activeProfileId,
    ) ?? null
  )
}

export function findProfileByName(name: string) {
  const target = normalizeName(name).toLowerCase()

  if (!target) {
    return null
  }

  return (
    listProfiles().find(
      (profile) => profile.name.toLowerCase() === target,
    ) ?? null
  )
}

function createProfileNameWithSuffix(baseName: string) {
  const normalizedBase = normalizeName(baseName)

  const taken = new Set(
    listProfiles().map((profile) =>
      profile.name.toLowerCase(),
    ),
  )

  if (!taken.has(normalizedBase.toLowerCase())) {
    return normalizedBase
  }

  let suffix = 2

  while (
    taken.has(
      `${normalizedBase} (${suffix})`.toLowerCase(),
    )
  ) {
    suffix += 1
  }

  return `${normalizedBase} (${suffix})`
}

export function createProfile(
  name: string,
  forceSuffix = false,
): PlayerProfile {
  const normalizedName = normalizeName(name)
  const assignedName = forceSuffix
    ? createProfileNameWithSuffix(normalizedName)
    : normalizedName

  const profile: PlayerProfile = {
    id: crypto.randomUUID(),
    name: assignedName,
    createdAt: now(),
    lastPlayedAt: now(),
    currentLevel: 0,
    totalScore: 0,
    usedWords: [],
    bestSingleRoundScore: 0,
    bestTimeRaceSeconds: null,
  }

  const store = readStore()

  const nextStore: ProfileStore = {
    ...store,
    activeProfileId: profile.id,
    profiles: [...store.profiles, profile],
  }

  writeStore(nextStore)
  return profile
}

export function setActiveProfile(profileId: string) {
  const store = readStore()
  const exists = store.profiles.some(
    (profile) => profile.id === profileId,
  )

  if (!exists) {
    return null
  }

  const nextStore: ProfileStore = {
    ...store,
    activeProfileId: profileId,
  }

  writeStore(nextStore)

  return (
    nextStore.profiles.find(
      (profile) => profile.id === profileId,
    ) ?? null
  )
}

export function updateProfile(
  profileId: string,
  updates: Partial<PlayerProfile>,
): PlayerProfile | null {
  const store = readStore()
  const index = store.profiles.findIndex(
    (profile) => profile.id === profileId,
  )

  if (index < 0) {
    return null
  }

  const existing = store.profiles[index]

  const updated: PlayerProfile = {
    ...existing,
    ...updates,
    id: existing.id,
    name: existing.name,
    lastPlayedAt: updates.lastPlayedAt ?? now(),
    usedWords: Array.isArray(updates.usedWords)
      ? updates.usedWords
      : existing.usedWords,
  }

  const profiles = [...store.profiles]
  profiles[index] = updated

  const nextStore: ProfileStore = {
    ...store,
    profiles,
  }

  writeStore(nextStore)
  return updated
}

export function hasProfiles() {
  return listProfiles().length > 0
}

export function isProfileStoreCorrupted() {
  return parseStore(window.localStorage.getItem(STORAGE_KEY)).corrupted
}

export function resetProfileStore() {
  window.localStorage.removeItem(STORAGE_KEY)
}

export function getLeaderboard(metric: LeaderboardMetric) {
  const rows: LeaderboardRow[] = listProfiles().map(
    (profile) => ({
      id: profile.id,
      name: profile.name,
      currentLevel: profile.currentLevel,
      totalScore: profile.totalScore,
      bestSingleRoundScore:
        profile.bestSingleRoundScore,
      bestTimeRaceSeconds: profile.bestTimeRaceSeconds,
      lastPlayedAt: profile.lastPlayedAt,
    }),
  )

  if (metric === 'single') {
    return rows.sort((a, b) => {
      if (
        b.bestSingleRoundScore !== a.bestSingleRoundScore
      ) {
        return (
          b.bestSingleRoundScore -
          a.bestSingleRoundScore
        )
      }

      return b.totalScore - a.totalScore
    })
  }

  if (metric === 'time') {
    return rows.sort((a, b) => {
      if (a.bestTimeRaceSeconds == null && b.bestTimeRaceSeconds == null) {
        return b.totalScore - a.totalScore
      }

      if (a.bestTimeRaceSeconds == null) {
        return 1
      }

      if (b.bestTimeRaceSeconds == null) {
        return -1
      }

      if (a.bestTimeRaceSeconds !== b.bestTimeRaceSeconds) {
        return a.bestTimeRaceSeconds - b.bestTimeRaceSeconds
      }

      return b.totalScore - a.totalScore
    })
  }

  return rows.sort((a, b) => {
    if (b.totalScore !== a.totalScore) {
      return b.totalScore - a.totalScore
    }

    return (
      b.bestSingleRoundScore - a.bestSingleRoundScore
    )
  })
}
