import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import JSZip from 'jszip'
import {
  adapterComponentsSchema,
  adapterProjectSchema,
  adapterScreensSchema,
  adapterStatesSchema,
  adapterTokensSchema,
  type AdapterComponent,
  type AdapterProject,
  type AdapterScreen,
  type AdapterState,
  type AdapterTokens,
} from '../../src/schemas/adapter'

const fixtureDirectory = path.resolve(process.cwd(), 'e2e/fixtures/house-todo')
const fixtureManifestPath = path.join(fixtureDirectory, 'fixture.json')

export interface HouseToDoFixtureManifest {
  upstreamRepository: string
  upstreamMergeCommit: string
  artifactPath: string
  expectedSha256: string
}

export interface AdapterFixture {
  manifest: HouseToDoFixtureManifest
  zipPath: string
  bytes: Buffer
  project: AdapterProject
  screens: AdapterScreen[]
  components: AdapterComponent[]
  states: AdapterState[]
  tokens: AdapterTokens
}

async function readJson(zip: JSZip, entry: string): Promise<unknown> {
  const file = zip.file(entry)
  if (!file) throw new Error(`HouseToDo fixture is missing ${entry}`)
  return JSON.parse(await file.async('string')) as unknown
}

export async function loadHouseToDoFixture(): Promise<AdapterFixture> {
  const manifest = JSON.parse(await fs.readFile(fixtureManifestPath, 'utf8')) as HouseToDoFixtureManifest
  const zipPath = path.resolve(process.cwd(), manifest.artifactPath)
  const bytes = await fs.readFile(zipPath)
  const actualSha256 = createHash('sha256').update(bytes).digest('hex').toUpperCase()
  if (actualSha256 !== manifest.expectedSha256.toUpperCase()) {
    throw new Error(`HouseToDo acceptance fixture changed unexpectedly: expected ${manifest.expectedSha256}, received ${actualSha256}`)
  }

  const zip = await JSZip.loadAsync(bytes)
  const project = adapterProjectSchema.parse(await readJson(zip, '.uilab/project.json'))
  const screenDocument = adapterScreensSchema.parse(await readJson(zip, '.uilab/screens.json'))
  const componentDocument = adapterComponentsSchema.parse(await readJson(zip, '.uilab/components.json'))
  const tokens = adapterTokensSchema.parse(await readJson(zip, '.uilab/tokens.json'))
  const stateDocument = adapterStatesSchema.parse(await readJson(zip, '.uilab/states.json'))

  return {
    manifest,
    zipPath,
    bytes,
    project,
    screens: Object.entries(screenDocument).map(([id, screen]) => ({ id, ...screen })),
    components: Object.entries(componentDocument).map(([id, component]) => ({ id, ...component })),
    states: Object.entries(stateDocument).flatMap(([screenId, states]) => Object.entries(states).map(([id, state]) => ({ id, screenId, ...state }))),
    tokens,
  }
}

export function ids(values: Array<{ id: string }>): string[] {
  return values.map((value) => value.id).sort()
}

export function stateIdsByScreen(states: AdapterState[]): Record<string, string[]> {
  return Object.fromEntries([...new Set(states.map((state) => state.screenId))].sort().map((screenId) => [
    screenId,
    states.filter((state) => state.screenId === screenId).map((state) => state.id).sort(),
  ]))
}
