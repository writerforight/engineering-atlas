import type { TopicMeta } from '../../core/topic';

export const meta: TopicMeta = {
  title: 'Türevin spektrumu: F{f′} = iωF',
  summary:
    'Türev almak spektrumda genliği |ω| ile çarpar, fazı +90° kaydırır; integral tersini yapar. FFT ile spektral türevi sonlu fark ve analitik türevle kıyasla, sızıntı ve gürültü tuzaklarını gör.',
  tags: ['sinyaller ve sistemler', 'Fourier', 'FFT', 'türev', 'sayısal yöntemler'],
  order: 25,
  de: {
    title: 'Das Spektrum der Ableitung: F{f′} = iωF',
    summary:
      'Ableiten multipliziert im Spektrum die Amplitude mit |ω| und verschiebt die Phase um +90°; Integrieren macht das Umgekehrte. Die spektrale Ableitung per FFT mit finiten Differenzen und der analytischen Ableitung vergleichen und die Fallen Leckeffekt und Rauschen sehen.',
    tags: ['Signale und Systeme', 'Fourier', 'FFT', 'Ableitung', 'numerische Verfahren'],
  },
};
