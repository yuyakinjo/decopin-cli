import { Dynamic, Line, ProgressBar, Spinner } from 'decopin-cli';

interface File {
  name: string;
  kb: number;
  got: number;
}

async function* download(): AsyncGenerator<File[]> {
  let files: File[] = [
    { name: 'app.js', kb: 180, got: 0 },
    { name: 'vendor.js', kb: 420, got: 0 },
    { name: 'styles.css', kb: 60, got: 0 },
  ];
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
      <Line>fetching 3 files</Line>
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
      <Line>downloaded 660 KB</Line>
    </>
  );
}
