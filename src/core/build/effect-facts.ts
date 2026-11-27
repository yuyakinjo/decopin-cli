/**
 * 「この名前は何に届くか」の表 (ADR 32 の fact)。
 *
 * 判定は**表に載っているものだけ**を信じる。載っていない名前
 * (`Bun.<新しい API>` / `node:<知らないモジュール>`) は、副作用が無いとも
 * 有るとも言わず、解析を諦める側 (`unknown`) に倒す。Bun の API は増える
 * ので、「知らない = 無害」と置くと、増えた分だけ `none` が嘘になる
 */
import type { EffectCategory } from '../types/effects.ts';

/** 届く先。`'escape'` は「その先を保証しない」 */
export type Reach = readonly EffectCategory[] | 'escape';

const NOTHING: readonly EffectCategory[] = [];
const FS: readonly EffectCategory[] = ['fs.read', 'fs.write'];
const READ: readonly EffectCategory[] = ['fs.read'];
const WRITE: readonly EffectCategory[] = ['fs.write'];
const NETWORK: readonly EffectCategory[] = ['network'];
const SPAWN: readonly EffectCategory[] = ['process.spawn'];
const MUTATE: readonly EffectCategory[] = ['process.mutate'];

function table(groups: [Reach, string][]): Record<string, Reach> {
  const out: Record<string, Reach> = {};
  for (const [reach, names] of groups) {
    for (const name of names.split(/\s+/)) {
      if (name !== '') out[name] = reach;
    }
  }
  return out;
}

/**
 * `Bun.<名前>` と `import { 名前 } from 'bun'`。
 *
 * 実測 (Bun 1.4.5 の `Object.getOwnPropertyNames(Bun)`) を分類したもの。
 * 役割を言い切れないもの (`Image` / `WebView` / `Terminal` / `cron` /
 * `secrets` / `ModuleGraph`) は載せていない = 保証しない
 */
export const BUN_MEMBERS: Record<string, Reach> = table([
  [SPAWN, '$ spawn spawnSync openInEditor'],
  [WRITE, 'write'],
  // `Bun.file()` は読むだけとは限らない (`.write()` / `.delete()` を持つ)。
  // 書き込みは effects.ts が使われ方から数える
  [READ, 'file which resolve resolveSync Glob FileSystemRouter embeddedFiles'],
  [FS, 'mmap build Archive'],
  [
    NETWORK,
    'fetch connect listen serve udpSocket dns s3 S3Client redis RedisClient FetchSession',
  ],
  // SQLite のファイルも開ける
  [['network', 'fs.read', 'fs.write'], 'sql SQL postgres'],
  ['escape', 'plugin registerMacro unsafe FFI jest'],
  [
    NOTHING,
    `ArrayBufferSink CSRF Cookie CookieMap CryptoHasher JSON5 JSONC JSONL
     MD4 MD5 SHA1 SHA224 SHA256 SHA384 SHA512 SHA512_256 TOML Transpiler XML
     YAML allocUnsafe argv color concatArrayBuffers cwd deepEquals deepMatch
     deflateSync enableANSIColors env escapeHTML fileURLToPath gc
     generateHeapSnapshot gunzipSync gzipSync hash indexOfLine inflateSync
     inspect isMainThread isStandaloneExecutable main markdown nanoseconds
     origin password pathToFileURL peek randomUUIDv5 randomUUIDv7
     readableStreamToArray readableStreamToArrayBuffer readableStreamToBlob
     readableStreamToBytes readableStreamToFormData readableStreamToJSON
     readableStreamToText revision semver sha shrink sleep sleepSync sliceAnsi
     stderr stdin stdout stringWidth stripANSI version version_with_sha
     wrapAnsi zstdCompress zstdCompressSync zstdDecompress zstdDecompressSync`,
  ],
]);

/** `process.<名前>` と `import { 名前 } from 'node:process'` */
export const PROCESS_MEMBERS: Record<string, Reach> = table([
  [
    MUTATE,
    `exit reallyExit abort chdir kill _kill umask setuid setgid seteuid setegid
     setgroups initgroups setUncaughtExceptionCaptureCallback`,
  ],
  [['process.spawn', 'process.mutate'], 'execve'],
  [['fs.read', 'process.mutate'], 'loadEnvFile'],
  [WRITE, 'report'],
  // 組み込みモジュールや native のコードを、import を通さずに取り出せる
  ['escape', 'binding _linkedBinding dlopen getBuiltinModule mainModule'],
  [
    NOTHING,
    `_exiting _getActiveHandles _getActiveRequests _preload_modules _rawDebug
     addListener allowedNodeEnvironmentFlags arch argv argv0 assert
     availableMemory browser channel config connected constrainedMemory
     cpuUsage cwd debugPort disconnect emit emitWarning env eventNames execArgv
     execPath exitCode features finalization getActiveResourcesInfo
     getMaxListeners getegid geteuid getgid getgroups getuid
     hasUncaughtExceptionCaptureCallback hrtime isBun listenerCount listeners
     memoryUsage moduleLoadList nextTick noDeprecation off on once openStdin
     pid platform ppid prependListener prependOnceListener rawListeners ref
     release removeAllListeners removeListener resourceUsage revision send
     setMaxListeners setSourceMapsEnabled stderr stdin stdout threadCpuUsage
     throwDeprecation title traceDeprecation unref uptime version versions`,
  ],
]);

/** `node:fs` の名前ごとの分類。名前で絞れると `none` を出せる場面が増える */
const FS_NAMES: Record<string, Reach> = table([
  [
    READ,
    `readFile readFileSync readdir readdirSync stat statSync lstat access
     accessSync exists existsSync createReadStream realpath opendir`,
  ],
  [
    WRITE,
    `writeFile writeFileSync appendFile appendFileSync mkdir mkdirSync rm
     rmSync rmdir unlink unlinkSync rename renameSync copyFile chmod chown
     symlink link truncate createWriteStream mkdtemp utimes`,
  ],
]);

export interface ModuleFact {
  /** モジュール全体が届く先 (名前を絞れないときはこちら) */
  reach: Reach;
  /** import した名前ごとの分類。表に無い名前は `reach` を採る */
  names?: Record<string, Reach>;
  /** 表に無い名前を「保証しない」にするか (`reach` を採る代わりに) */
  strictNames?: boolean;
  /**
   * 同じものを指すグローバルの名前。既定 / 名前空間 import がこの名前なら、
   * グローバルの検査がそのまま効く。違う名前に入れたら追えない
   */
  global?: string;
}

/**
 * 組み込みモジュール (`node:` を付けた名前で引く)。
 *
 * **載っていない `node:` モジュールは保証しない**。`node:module`
 * (createRequire) / `node:vm` / `node:worker_threads` / `node:inspector` は、
 * 解析が歩いていないコードを動かせる
 */
export const NODE_MODULES: Record<string, ModuleFact> = {
  'node:fs': { reach: FS, names: FS_NAMES },
  'node:fs/promises': { reach: FS, names: FS_NAMES },
  'node:sqlite': { reach: FS },
  'node:child_process': { reach: SPAWN },
  'node:cluster': { reach: SPAWN },
  'node:process': {
    reach: 'escape',
    names: PROCESS_MEMBERS,
    strictNames: true,
    global: 'process',
  },
};
for (const name of [
  'http',
  'https',
  'http2',
  'net',
  'tls',
  'dgram',
  'dns',
  'dns/promises',
]) {
  NODE_MODULES[`node:${name}`] = { reach: NETWORK };
}
for (const name of [
  'assert',
  'assert/strict',
  'async_hooks',
  'buffer',
  'console',
  'constants',
  'crypto',
  'diagnostics_channel',
  'events',
  'os',
  'path',
  'path/posix',
  'path/win32',
  'perf_hooks',
  'punycode',
  'querystring',
  'readline',
  'readline/promises',
  'stream',
  'stream/consumers',
  'stream/promises',
  'stream/web',
  'string_decoder',
  'sys',
  'timers',
  'timers/promises',
  'tty',
  'url',
  'util',
  'util/types',
  'zlib',
]) {
  NODE_MODULES[`node:${name}`] = { reach: NOTHING };
}

/**
 * Bun が自前で持つモジュール。`Bun.resolveSync` は**指定子をそのまま返す**
 * (ファイルに解決しない) ので、歩けない。放っておくと network のパッケージが
 * `none` を名乗ってしまう (実測: node-fetch / undici が 1 ファイルで all none)
 */
export const BUN_MODULES: Record<string, ModuleFact> = {
  // `import { $ } from 'bun'` は `Bun.$` と同じもの
  bun: {
    reach: 'escape',
    names: BUN_MEMBERS,
    strictNames: true,
    global: 'Bun',
  },
  'bun:test': { reach: NOTHING },
  'bun:jsc': { reach: NOTHING },
  'bun:sqlite': { reach: FS },
  'node-fetch': { reach: NETWORK },
  undici: { reach: NETWORK },
  ws: { reach: NETWORK },
};

/**
 * 中身を歩かずに「こう」と決めてよいもの。
 *
 * 枠組み自身が最初の登録。`decopin-cli` の中の `process.exit` は
 * **終了コードを返す仕組み**であってコマンドの副作用ではない。歩くと
 * 全コマンドが `process.mutate: detected` になり、判定が意味を失う。
 */
export const FACTS: Record<string, readonly EffectCategory[]> = {
  'decopin-cli': [],
  'decopin-cli/jsx': [],
  'decopin-cli/jsx-runtime': [],
  'decopin-cli/jsx-dev-runtime': [],
};

/**
 * よく使われるパッケージの fact (パッケージ名で引く。サブパスも同じ判定)。
 *
 * 歩けば分かるものは載せない。載せるのは**歩くと `unknown` に落ちるもの**
 * (`require(変数)` を中に持つ) と、歩くのが無駄に重いもの。実測 (2026-09):
 * axios / fs-extra / zx / lodash-es / yaml は計算された require で unknown、
 * lodash-es は 641 ファイル。判定は各パッケージの公開された役割から
 */
export const PACKAGE_FACTS: Record<string, readonly EffectCategory[]> = {
  axios: ['network'],
  got: ['network'],
  ky: ['network'],
  'fs-extra': ['fs.read', 'fs.write'],
  'graceful-fs': ['fs.read', 'fs.write'],
  execa: ['process.spawn'],
  'cross-spawn': ['process.spawn'],
  zx: ['process.spawn', 'fs.read', 'fs.write', 'network'],
  lodash: [],
  'lodash-es': [],
  yaml: [],
  zod: [],
  valibot: [],
  chalk: [],
  picocolors: [],
  dayjs: [],
};

/** `Bun.file(x).<名前>` のうち、読むだけのもの */
export const FILE_READERS = new Set([
  'text',
  'json',
  'arrayBuffer',
  'bytes',
  'stream',
  'formData',
  'exists',
  'stat',
  'size',
  'type',
  'name',
  'lastModified',
]);

/** `Bun.file(x).<名前>` のうち、ファイルを変えるもの */
export const FILE_WRITERS = new Set(['write', 'writer', 'delete', 'unlink']);

/**
 * import できるが JS ではなく、中身がデータとして入るだけのもの。
 * ここに無い拡張子 (`.node` / `.wasm` / `.db`) は保証しない
 */
export const DATA_FILE = /\.(json|jsonc|json5|toml|ya?ml|txt|md|css|html|svg)$/;
