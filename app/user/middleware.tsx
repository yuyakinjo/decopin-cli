import { Line, Stderr, Text, type MiddlewareProps } from 'decopin-cli';

/**
 * `app/user/` 以下のコマンドの実行を包む (§4.6)。
 * `next` は関数なので、呼んだ後に「終わったあとの処理」が書ける。
 */
export default async function UserMiddleware({
  next,
  options,
}: MiddlewareProps) {
  const started = performance.now();
  const output = await next();
  const elapsed = Math.round(performance.now() - started);

  if (options.verbose !== true) return output;
  return (
    <>
      {output}
      <Stderr>
        <Line>
          <Text dim>took {elapsed}ms</Text>
        </Line>
      </Stderr>
    </>
  );
}
