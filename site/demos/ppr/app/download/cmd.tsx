import { Dynamic, Line, ProgressBar, Spinner } from 'decopin-cli';

interface File {
  name: string;
  kb: number;
  got: number;
}

const FILES = [
  { name: 'app.js', kb: 180 },
  { name: 'vendor.js', kb: 420 },
  { name: 'styles.css', kb: 60 },
];
const TOTAL_KB = FILES.reduce((sum, file) => sum + file.kb, 0);

async function* download(): AsyncGenerator<File[]> {
  let files: File[] = FILES.map((file) => ({ ...file, got: 0 }));
  while (files.some((file) => file.got < file.kb)) {
    files = files.map((file) => ({
      ...file,
      got: Math.min(file.kb, file.got + 6 + Math.random() * 12),
    }));
    yield files;
    await Bun.sleep(60); // stands in for the real transfer
  }
}

export default function Command() {
  return (
    <>
      <Line>fetching {FILES.length} files</Line>
      <Dynamic source={download()} interval={80}>
        {(files) => (
          <>
            {files.map((file) => (
              <Line key={file.name}>
                {file.got < file.kb ? <Spinner /> : '✓'}{' '}
                <ProgressBar value={file.got} max={file.kb} width={20} />{' '}
                {file.name.padEnd(10)} {Math.round(file.got)}/{file.kb} KB
              </Line>
            ))}
          </>
        )}
      </Dynamic>
      <Line>downloaded {TOTAL_KB} KB</Line>
    </>
  );
}
