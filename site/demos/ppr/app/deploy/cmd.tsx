import { Dynamic, Line, ProgressBar, Spinner } from 'decopin-cli';

interface Progress {
  step: string;
  done: number;
}

const STEPS = ['building', 'testing', 'pushing'];

async function* deploySteps(): AsyncGenerator<Progress> {
  for (const [done, step] of STEPS.entries()) {
    yield { step, done };
    await Bun.sleep(1200); // stands in for the real work
  }
  yield { step: 'released', done: STEPS.length };
}

export default function Command() {
  return (
    <>
      <Line>deploy started</Line>
      <Dynamic source={deploySteps()} interval={80}>
        {(progress) => (
          <Line>
            <Spinner />{' '}
            <ProgressBar value={progress.done} max={STEPS.length} width={16} />{' '}
            {progress.step}
          </Line>
        )}
      </Dynamic>
      <Line>all done</Line>
    </>
  );
}
