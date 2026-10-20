import { Step, Steps, Tex } from '../../core/ui';

export function Intuition() {
  return <p className="prose">Tek paragraflık sezgi.</p>;
}

export function Derivation() {
  return (
    <Steps>
      <Step title="Tanım" why="Başlangıç noktası; neyin verildiğini yaz.">
        <Tex block tex="f(x) = \sin(kx)" />
      </Step>
    </Steps>
  );
}

export function Notes() {
  return <p className="prose">Yorum ve genelleme notları.</p>;
}
