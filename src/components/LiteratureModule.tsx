import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { speakTextWithBestVoice } from '../utils/speech';
import { Book, Volume2, HelpCircle, FileText, Info, Lock, CheckCircle, PlayCircle, Trophy, Sparkles, ChevronRight, ArrowLeft } from 'lucide-react';
import { getApiUrl } from '../utils/api';

interface BookType {
  id: string;
  title: string;
  author: string;
  source_lang: 'es' | 'en';
  synopsis: string;
  synopsis_en?: string;
  synopsis_es?: string;
}

interface ChapterType {
  id: string;
  book_id: string;
  chapter_number: number;
  title: string;
  synopsis: string;
  summary_basic: string;
  summary_intermediate: string;
  summary_advanced: string;
  lines: Array<{
    target: string;
    native: string;
  }>;
}

interface ProgressType {
  completed_chapters: number[];
  current_chapter: number;
}

// Local fallback data if API requests fail
const LOCAL_FALLBACK_BOOKS: BookType[] = [
  {
    id: 'quijote',
    title: 'Don Quijote de la Mancha (Capítulo I)',
    author: 'Miguel de Cervantes',
    source_lang: 'es',
    synopsis: 'Un hidalgo de la Mancha pierde la razón de tanto leer novelas de caballerías y decide lanzarse al mundo como caballero andante, buscando honor, batallas y amor cortesano.',
    synopsis_es: 'Un hidalgo de la Mancha pierde la razón de tanto leer novelas de caballerías y decide lanzarse al mundo como caballero andante, buscando honor, batallas y amor cortesano.',
    synopsis_en: 'A nobleman from La Mancha loses his sanity from reading chivalric romances and sets off into the world as a knight-errant, seeking honor, battles, and courtly love.'
  },
  {
    id: 'principito',
    title: 'El Principito (Capítulo II)',
    author: 'Antoine de Saint-Exupéry',
    source_lang: 'es',
    synopsis: 'Un piloto varado en el desierto del Sahara entabla amistad con un pequeño y misterioso príncipe que proviene de un asteroide lejano y viaja por el cosmos buscando respuestas.',
    synopsis_es: 'Un piloto varado en el desierto del Sahara entabla amistad con un pequeño y misterioso príncipe que proviene de un asteroide lejano y viaja por el cosmos buscando respuestas.',
    synopsis_en: 'A pilot stranded in the Sahara Desert befriends a mysterious young prince hailing from a distant asteroid who travels the cosmos seeking answers.'
  },
  {
    id: 'vida_sueno',
    title: 'La Vida es Sueño (Jornada I, Escena II)',
    author: 'Pedro Calderón de la Barca',
    source_lang: 'es',
    synopsis: 'Una obra filosófica clásica que gira en torno a Segismundo, príncipe de Polonia, encarcelado en una torre secreta desde su nacimiento por su propio padre debido a una profecía fatal.',
    synopsis_es: 'Una obra filosófica clásica que gira en torno a Segismundo, príncipe de Polonia, encarcelado en una torre secreta desde su nacimiento por su propio padre debido a una profecía fatal.',
    synopsis_en: 'A classic philosophical drama centering on Segismundo, Prince of Poland, imprisoned in a secret tower from birth by his own father due to a dire prophecy.'
  },
  {
    id: 'hamlet',
    title: 'Hamlet (Act III, Scene I)',
    author: 'William Shakespeare',
    source_lang: 'en',
    synopsis: 'The ultimate tragedy of Prince Hamlet of Denmark, who is tasked by his father\'s ghost to avenge his murder by killing his uncle Claudius, who has usurped the throne.',
    synopsis_en: 'The ultimate tragedy of Prince Hamlet of Denmark, who is tasked by his father\'s ghost to avenge his murder by killing his uncle Claudius, who has usurped the throne.',
    synopsis_es: 'La tragedia definitiva del príncipe Hamlet de Dinamarca, encomendado por el fantasma de su padre para vengar su asesinato matando a su tío Claudio, quien ha usurpado el trono.'
  },
  {
    id: 'pride_prejudice',
    title: 'Pride and Prejudice (Chapter I)',
    author: 'Jane Austen',
    source_lang: 'en',
    synopsis: 'A classic romantic novel charting the emotional development of Elizabeth Bennet, who learns the difference between superficial goodness and actual integrity.',
    synopsis_en: 'A classic romantic novel charting the emotional development of Elizabeth Bennet, who learns the difference between superficial goodness and actual integrity.',
    synopsis_es: 'Una novela romántica clásica que traza el desarrollo emocional de Elizabeth Bennet, quien aprende la diferencia entre la bondad superficial y la verdadera integridad.'
  }
];

const LOCAL_FALLBACK_CHAPTERS: Record<string, ChapterType[]> = {
  quijote: [
    {
      id: 'q1',
      book_id: 'quijote',
      chapter_number: 1,
      title: 'Capítulo I',
      synopsis: 'Introducción a Alonso Quijano, sus costumbres cotidianas, su dieta y cómo su obsesión con la literatura medieval lo arrastra a convertirse en Don Quijote.',
      summary_basic: 'Alonso Quijano es un hombre que lee muchos libros de caballeros. [Alonso Quijano is a man who reads many books of knights.] Él decide ser un caballero. [He decides to be a knight.] Busca una armadura y un caballo. [He looks for armor and a horse.]',
      summary_intermediate: 'Alonso Quijano vive en la Mancha y le apasiona leer novelas de caballerías. Pasa las noches leyendo hasta perder el juicio. Finalmente, decide convertirse en caballero andante para defender el honor y vivir aventuras.',
      summary_advanced: 'El hidalgo Alonso Quijano, obsesionado con las crónicas de caballería medievales, descuiza su hacienda y enajena su mente por completo. En su delirio heroico, se autoproclama Don Quijote de la Mancha, resucitando la caballería andante.',
      lines: [
        { target: 'En un lugar de la Mancha,', native: 'In a place of La Mancha,' },
        { target: 'de cuyo nombre no quiero acordarme,', native: 'whose name I do not wish to remember,' },
        { target: 'no ha mucho tiempo que vivía un hidalgo de los de lanza en astillero,', native: 'not long ago there lived a nobleman, one of those with a lance in a rack,' },
        { target: 'adarga antigua, rocín flaco y galgo corredor.', native: 'an ancient shield, a skinny nag, and a racing greyhound.' }
      ]
    },
    {
      id: 'q2',
      book_id: 'quijote',
      chapter_number: 2,
      title: 'Capítulo II',
      synopsis: 'Don Quijote realiza su primera salida en solitario buscando aventuras y llega a una venta local, confundiéndola con un gran castillo medieval.',
      summary_basic: 'Él monta en su caballo Rocinante. [He rides his horse Rocinante.] Viaja todo el día bajo el sol. [He travels all day under the sun.] Llega a una venta por la noche. [He arrives at an inn by night.]',
      summary_intermediate: 'Al amanecer, Don Quijote emprende su primera salida en secreto. Después de cabalgar todo el día bajo un sol abrasador, divisa una humilde venta, la cual confunde con un castillo de altas torres y puentes levadizos.',
      summary_advanced: 'Sin dar parte a persona alguna, nuestro flamante caballero andante inicia su andadura en la calurosa llanura manchega. Al caer la noche, fatigado y hambriento, arriba a una hostería rural que sus desvaríos transfiguran de inmediato en una fortaleza feudal.',
      lines: [
        { target: 'Salió al campo con grandísimo contento,', native: 'He went out into the field with very great joy,' },
        { target: 'pero le asaltó un pensamiento terrible:', native: 'but a terrible thought assailed him:' },
        { target: 'que no estaba armado caballero.', native: 'that he was not yet dubbed a knight.' }
      ]
    },
    {
      id: 'q3',
      book_id: 'quijote',
      chapter_number: 3,
      title: 'Capítulo III',
      synopsis: 'La cómica ceremonia nocturna en la venta donde el astuto hostelero decide "armar caballero" a Don Quijote para librarse de él.',
      summary_basic: 'Él vela sus armas en el patio. [He watches his weapons in the courtyard.] El ventero le da un golpe en el hombro. [The innkeeper strikes him on the shoulder.] Ahora es un caballero oficial. [Now he is an official knight.]',
      summary_intermediate: 'Para ser un caballero legítimo, Don Quijote insiste en velar sus armas en el patio de la venta. Tras un altercado con unos arrieros, el socarrón ventero decide complacerle y armarlo caballero en una cómica ceremonia.',
      summary_advanced: 'Persuadido de la urgencia ritual, Don Quijote realiza la vela de sus armas junto a una pila de agua, repeliendo con violencia a los arrieros que pretendían moverlas. El astuto ventero realiza la farsa de armarlo caballero para acelerar su partida.',
      lines: [
        { target: 'El ventero le aconsejó que llevase dinero', native: 'The innkeeper advised him to carry money' },
        { target: 'y camisas limpias,', native: 'and clean shirts,' },
        { target: 'porque los caballeros de los libros siempre los tenían.', native: 'because the knights in the books always had them.' }
      ]
    }
  ],
  principito: [
    {
      id: 'p1',
      book_id: 'principito',
      chapter_number: 1,
      title: 'Capítulo II',
      synopsis: 'El encuentro fortuito del narrador con el principito en el desierto tras el accidente de aviación.',
      summary_basic: 'El piloto duerme en la arena del desierto. [The pilot sleeps on the desert sand.] Un pequeño niño le despierta. [A little boy wakes him up.] El niño le pide un dibujo de un cordero. [The boy asks him for a drawing of a sheep.]',
      summary_intermediate: 'El narrador sufre una avería en el desierto del Sahara y se encuentra completamente solo. Al amanecer, se despierta con la presencia misteriosa de un principito que le solicita insistentemente dibujar un cordero.',
      summary_advanced: 'Tras un aterrizaje forzoso en la inmensidad del Sahara, el piloto se ve confrontado con lo extraordinario: un infante celestial que emerge al romper el día demandando con obstinación la representación gráfica de un ovino.',
      lines: [
        { target: 'Viví así, solo, sin nadie con quien hablar verdaderamente,', native: 'I lived like this, alone, with no one to truly talk to,' },
        { target: 'hasta que tuve una avería en el desierto del Sahara hace seis años.', native: 'until I had a breakdown in the Sahara Desert six years ago.' },
        { target: 'Algo se había roto en mi motor.', native: 'Something had broken in my engine.' }
      ]
    },
    {
      id: 'p2',
      book_id: 'principito',
      chapter_number: 2,
      title: 'Capítulo IV',
      synopsis: 'El narrador descubre los orígenes cósmicos del principito y reflexiona sobre el asteroide B-612 y el punto de vista rígido de los adultos.',
      summary_basic: 'El principito viene de un asteroide pequeño. [The little prince comes from a small asteroid.] Se llama B-612. [It is called B-612.] Los adultos solo quieren números. [Adults only want numbers.]',
      summary_intermediate: 'El narrador descubre que el hogar del principito es el asteroide B-612. Critica cómo las personas mayores están obsesionadas con las cifras y los números, perdiendo de vista la belleza esencial y los detalles poéticos de la vida.',
      summary_advanced: 'La reconstrucción biográfica del principito revela que su planeta de origen es el minúsculo asteroide B-612, catalogado por un astrónomo turco. El autor deplora la predisposición adulta a cuantificarlo todo mediante cifras financieras e informativas.',
      lines: [
        { target: 'Las personas mayores adoran las cifras.', native: 'Grown-ups love numbers.' },
        { target: 'Nunca te preguntan sobre lo esencial.', native: 'They never ask you about essential matters.' },
        { target: 'Si les dices: "He visto una hermosa casa de ladrillos rosas...",', native: 'If you say to them: "I have seen a beautiful house of pink bricks...",' },
        { target: 'no pueden imaginarse la casa.', native: 'they cannot imagine the house.' }
      ]
    },
    {
      id: 'p3',
      book_id: 'principito',
      chapter_number: 3,
      title: 'Capítulo VII',
      synopsis: 'El principito llora al preocuparse por el peligro que corren las flores de su planeta a causa de las ovejas, cuestionando lo que es verdaderamente importante.',
      summary_basic: 'Las ovejas comen flores. [Sheep eat flowers.] El principito tiene una flor única. [The little prince has a unique flower.] Él tiene miedo de perderla. [He is afraid of losing it.]',
      summary_intermediate: 'El principito discute con el piloto sobre si los corderos se comen las flores con espinas. Al darse cuenta de que su querida rosa corre peligro, estalla en lágrimas, defendiendo la importancia de cuidar el amor y la belleza.',
      summary_advanced: 'Confrontado con la realidad ecológica de que los corderos se alimentan de arbustos y espinas, el principito expresa una angustia desgarradora por la vulnerabilidad de su flor única, reprochándole al piloto su frialdad científica.',
      lines: [
        { target: 'Si una persona ama a una flor de la que no existe más que un ejemplar...', native: 'If a person loves a flower of which there is only one single example...' },
        { target: 'eso basta para que sea feliz cuando la mira.', native: 'that is enough to make him happy when he looks at it.' },
        { target: 'Ella se dice: "Mi flor está allí en alguna parte..."', native: 'She says to herself: "My flower is out there somewhere..."' }
      ]
    }
  ],
  vida_sueno: [
    {
      id: 'v1',
      book_id: 'vida_sueno',
      chapter_number: 1,
      title: 'Jornada I, Escena II',
      synopsis: 'El lamento existencial del príncipe Segismundo encadenado en su torre secreta.',
      summary_basic: 'Segismundo está encerrado en una torre. [Segismundo is locked in a tower.] Él se pregunta por qué no tiene libertad. [He wonders why he does not have freedom.] Los animales tienen más libertad que él. [Animals have more freedom than him.]',
      summary_intermediate: 'El príncipe Segismundo reflexiona con profunda amargura sobre su cruel destino y cautiverio. Compara su falta de libertad con las aves, los peces y los ríos, sintiendo una honda injusticia existencial.',
      summary_advanced: 'Enclaustrado y encadenado en una lúgubre torre, Segismundo declama su desgarrador soliloquio, cuestionando el libre albedrío y lamentando que las criaturas más ínfimas del cosmos gocen de la libertad que a él le es denegada.',
      lines: [
        { target: '¡Ay mísero de mí, y ay infelice!', native: 'Ah, wretched me! Oh, unhappy man!' },
        { target: 'Apurar, cielos, pretendo,', native: 'I try to determine, heavens,' },
        { target: 'ya que me tratáis así,', native: 'since you treat me so,' },
        { target: 'qué delito cometí contra vosotros naciendo.', native: 'what crime I committed against you by being born.' }
      ]
    },
    {
      id: 'v2',
      book_id: 'vida_sueno',
      chapter_number: 2,
      title: 'Jornada II, Escena VI',
      synopsis: 'Segismundo es llevado a la corte bajo los efectos de un somnífero, reaccionando con furia y violencia ante su nueva realidad como príncipe heredero.',
      summary_basic: 'Segismundo despierta en un palacio rico. [Segismundo wakes up in a rich palace.] Él se enfada con los sirvientes. [He gets angry with the servants.] Lanza a un hombre por la ventana. [He throws a man out the window.]',
      summary_intermediate: 'Segismundo despierta vestido de seda en la corte y descubre que es el príncipe de Polonia. Confundido y furioso por el engaño de su padre Basilio, reacciona violentamente contra los cortesanos y comete actos de crueldad.',
      summary_advanced: 'Trasladado narcotizado al palacio real por orden del rey Basilio, Segismundo experimenta un súbito despertar cortesano. Su carácter, forjado en el cautiverio hostil, eclosiona en soberbia tiránica, agrediendo a quienes pretenden moderar su ira.',
      lines: [
        { target: '¿Yo en palacio? ¿Yo vestido de sedas?', native: 'Me in palace? Me dressed in silks?' },
        { target: 'Decir que sueño es engaño;', native: 'To say I dream is a delusion;' },
        { target: 'bien sé que despierto estoy.', native: 'I know well that I am awake.' }
      ]
    },
    {
      id: 'v3',
      book_id: 'vida_sueno',
      chapter_number: 3,
      title: 'Jornada III, Escena X',
      synopsis: 'La célebre conclusión filosófica sobre la transitoriedad de la vida terrenal y la ilusión del poder.',
      summary_basic: 'Segismundo vuelve a la torre encadenado. [Segismundo returns to the tower in chains.] Él cree que todo fue un sueño. [He thinks everything was a dream.] La vida es una ilusión. [Life is an illusion.]',
      summary_intermediate: 'Devuelto a su prisión y convencido de que su estancia en el palacio fue una ilusión, Segismundo pronuncia sus famosos versos sobre la fugacidad de la vida, concluyendo que toda la existencia es un sueño pasajero.',
      summary_advanced: 'Conducido nuevamente a su confinamiento tras su desastroso despliegue cortesano, Segismundo asimila la lección de Clotaldo. Su soliloquio metafísico postula que los triunfos temporales y las jerarquías terrenales son meros delirios oníricos.',
      lines: [
        { target: '¿Qué es la vida? Un frenesí.', native: 'What is life? A frenzy.' },
        { target: '¿Qué es la vida? Una ilusión, una sombra, una ficción,', native: 'What is life? An illusion, a shadow, a fiction,' },
        { target: 'y el mayor bien es pequeño; que toda la vida es sueño,', native: 'and the greatest good is small; for all life is a dream,' },
        { target: 'y los sueños, sueños son.', native: 'and dreams, dreams are.' }
      ]
    }
  ],
  hamlet: [
    {
      id: 'h1',
      book_id: 'hamlet',
      chapter_number: 1,
      title: 'Act III, Scene I',
      synopsis: 'Hamlet\'s deep philosophical reflection on existence, suffering, and mortality.',
      summary_basic: 'Hamlet se pregunta si es mejor vivir o morir. [Hamlet asks himself if it is better to live or to die.] La vida tiene muchos problemas. [Life has many problems.] Él tiene miedo de la muerte. [He is afraid of death.]',
      summary_intermediate: 'El príncipe Hamlet debate si es más noble tolerar los sufrimientos de la vida o ponerles fin a través de la muerte. Considera que el miedo a lo desconocido después de la muerte nos paraliza de actuar.',
      summary_advanced: 'Hamlet pronuncia su célebre monólogo existencial sobre el suicidio, el sufrimiento y la parálisis de la voluntad ante el temor de lo desconocido en el más allá, ponderando la inacción contra el enfrentamiento.',
      lines: [
        { target: 'To be, or not to be, that is the question:', native: 'Ser o no ser, esa es la cuestión:' },
        { target: "Whether 'tis nobler in the mind to suffer", native: 'Si es más noble para el espíritu sufrir' },
        { target: 'The slings and arrows of outrageous fortune,', native: 'Los golpes y dardos de la insultante fortuna,' }
      ]
    },
    {
      id: 'h2',
      book_id: 'hamlet',
      chapter_number: 2,
      title: 'Act III, Scene II',
      synopsis: 'Hamlet sets up a theatrical play ("The Mousetrap") depicting his father\'s murder to trap King Claudius into revealing his guilt.',
      summary_basic: 'Hamlet hace una obra de teatro. [Hamlet makes a play.] Los actores imitan un asesinato. [The actors imitate a murder.] El rey Claudio se asusta y sale. [King Claudius gets scared and leaves.]',
      summary_intermediate: 'Hamlet instruye a un grupo de actores para que representen un regicidio similar al de su padre frente al rey Claudio. Al presenciar la escena, Claudio se altera enormemente y abandona la sala, confirmando su culpabilidad.',
      summary_advanced: 'Con el propósito de obtener pruebas empíricas sobre la traición de Claudio, Hamlet organiza una escenificación teatral de la felonía descrita por el espectro. La violenta salida de la corte del usurpador constata de forma irrevocable su magnicidio.',
      lines: [
        { target: 'The play\'s the thing', native: 'La obra de teatro es la trampa' },
        { target: 'wherein I\'ll catch the conscience of the king.', native: 'en la que atraparé la conciencia del rey.' }
      ]
    },
    {
      id: 'h3',
      book_id: 'hamlet',
      chapter_number: 3,
      title: 'Act III, Scene IV',
      synopsis: 'Hamlet confronts his mother Gertrude in her chamber and accidentally kills Polonius who was hiding behind the curtain.',
      summary_basic: 'Hamlet habla enfadado con su madre. [Hamlet talks angrily with his mother.] Alguien escucha detrás de una cortina. [Someone listens behind a curtain.] Hamlet saca su espada y le mata. [Hamlet draws his sword and kills him.]',
      summary_intermediate: 'Hamlet reprende duramente a su madre Gertrudis en sus aposentos. Al oír un ruido detrás de los tapices, ataca impulsivamente y asesina a Polonius, confundiéndolo con el rey Claudio.',
      summary_advanced: 'Durante una tempestuosa entrevista maternofilial encaminada a denunciar su infidelidad conyugal, Hamlet advierte un espía tras los cortinajes. Desenvainando su acero en un rapto irreflexivo, atraviesa a Polonius creyendo herir al soberano.',
      lines: [
        { target: 'Mother, you have my father much offended.', native: 'Madre, habéis ofendido mucho a mi padre.' },
        { target: 'How now! a rat? Dead, for a ducat, dead!', native: '¡Cómo! ¿una rata? ¡Muerta, por un ducado, muerta!' }
      ]
    }
  ],
  pride_prejudice: [
    {
      id: 'pp1',
      book_id: 'pride_prejudice',
      chapter_number: 1,
      title: 'Chapter I',
      synopsis: 'The arrival of Mr. Bingley at Netherfield Park and Mrs. Bennet\'s schemes.',
      summary_basic: 'La señora Bennet quiere casar a sus hijas. [Mrs. Bennet wants to marry her daughters.] Un hombre rico llega al barrio. [A wealthy man arrives in the neighborhood.] Ella le pide a su esposo que lo visite. [She asks her husband to visit him.]',
      summary_intermediate: 'La señora Bennet está entusiasmada por la llegada de un joven soltero y acaudalado llamado Bingley. Insiste a su esposo, el señor Bennet, para que establezca contacto y así asegurar el futuro de una de sus hijas.',
      summary_advanced: 'La noticia de que un soltero aristócrata y acaudalado se ha establecido en las inmediaciones altera el ánimo de la señora Bennet, quien apremia con tenacidad a su sarcástico cónyuge para que formalice las visitas sociales de rigor.',
      lines: [
        { target: 'It is a truth universally acknowledged,', native: 'Es una verdad mundialmente reconocida,' },
        { target: 'that a single man in possession of a good fortune,', native: 'que un hombre soltero, dueño de una gran fortuna,' },
        { target: 'must be in want of a wife.', native: 'necesita una esposa.' }
      ]
    },
    {
      id: 'pp2',
      book_id: 'pride_prejudice',
      chapter_number: 2,
      title: 'Chapter II',
      synopsis: 'Mr. Bennet secretly visits Mr. Bingley first, teasing his wife and daughters before revealing the surprise.',
      summary_basic: 'El señor Bennet visita al nuevo vecino. [Mr. Bennet visits the new neighbor.] Él no le dice nada a su familia. [He does not tell his family anything.] Luego lo revela en la cena. [Later he reveals it at dinner.]',
      summary_intermediate: 'Aunque simula desinterés ante los ruegos de su esposa, el señor Bennet es uno de los primeros en presentar sus respetos al señor Bingley. Pasa días divirtiendo a sus hijas con sarcasmo antes de revelar su visita secreta.',
      summary_advanced: 'Ocultando sus verdaderos propósitos bajo un manto de aparente apatía y cinismo intelectual, el señor Bennet ejecuta su visita al recién llegado. Prolonga el suspenso doméstico con ironía antes de confirmar la formalización de la alianza vecinal.',
      lines: [
        { target: 'Mr. Bennet was among the earliest of those who waited on Mr. Bingley.', native: 'El señor Bennet estuvo entre los primeros que visitaron al señor Bingley.' },
        { target: 'He had always intended to visit him,', native: 'El señor siempre había tenido la intención de visitarlo,' },
        { target: 'aunque hasta el último momento siempre declaró que no iría.', native: 'though to the last always declaring that he should not go.' }
      ]
    },
    {
      id: 'pp3',
      book_id: 'pride_prejudice',
      chapter_number: 3,
      title: 'Chapter III',
      synopsis: 'The assembly ball at Meryton, where Mr. Darcy makes a cold first impression by refusing to dance with Elizabeth Bennet.',
      summary_basic: 'Ellos van a un baile público. [They go to a public ball.] El señor Darcy es muy orgulloso. [Mr. Darcy is very proud.] Él no quiere bailar con Elizabeth. [He does not want to dance with Elizabeth.]',
      summary_intermediate: 'En el baile de Meryton, el señor Bingley es encantador, pero su amigo el señor Darcy causa una impresión nefasta debido a su soberbia. Darcy llega a insultar a Elizabeth Bennet negándose a sacarla a bailar.',
      summary_advanced: 'La asamblea danzante de Meryton constata el contraste social entre el afable Bingley y la altanería aristocrática de Darcy. Este último desata la antipatía de la comunidad tras calificar a Elizabeth Bennet como una joven meramente pasable.',
      lines: [
        { target: 'She is tolerable, but not handsome enough to tempt me;', native: 'Es pasable, pero no lo suficientemente hermosa para tentarme;' },
        { target: 'and I am in no humour at present to give consequence', native: 'y no estoy de humor en este momento para dar importancia' },
        { target: 'to young ladies who are slighted by other men.', native: 'a señoritas que son despreciadas por otros hombres.' }
      ]
    }
  ]
};

export const LiteratureModule: React.FC = () => {
  const { nativeLanguage, speechRate, setSpeechRate, level, user, recordActivity } = useApp();

  // Navigation states: 'books' | 'chapters' | 'reader'
  const [currentView, setCurrentView] = useState<'books' | 'chapters' | 'reader'>('books');
  const [books, setBooks] = useState<BookType[]>([]);
  const [selectedBook, setSelectedBook] = useState<BookType | null>(null);
  const [chapters, setChapters] = useState<ChapterType[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<ChapterType | null>(null);
  const [progress, setProgress] = useState<ProgressType>({ completed_chapters: [], current_chapter: 1 });
  const [loading, setLoading] = useState<boolean>(true);
  const [completing, setCompleting] = useState<boolean>(false);
  
  // Layout states for reader
  const [layoutMode, setLayoutMode] = useState<'target' | 'translation'>('translation');
  const [fontSize, setFontSize] = useState<number>(14);
  const [isMobile, setIsMobile] = useState<boolean>(false);

  const targetLang = nativeLanguage === 'en' ? 'es' : 'en';

  // Resize listener
  useEffect(() => {
    const checkResize = () => setIsMobile(window.innerWidth < 450);
    checkResize();
    window.addEventListener('resize', checkResize);
    return () => window.removeEventListener('resize', checkResize);
  }, []);

  // Fetch all books on mount or when target language changes
  useEffect(() => {
    const fetchBooks = async () => {
      setLoading(true);
      try {
        const response = await fetch(getApiUrl('/api/literature/books'));
        if (!response.ok) throw new Error('API failed');
        const data = await response.json();
        setBooks(data.filter((b: BookType) => b.source_lang === targetLang));
      } catch (err) {
        console.warn('Using offline fallback books:', err);
        setBooks(LOCAL_FALLBACK_BOOKS.filter(b => b.source_lang === targetLang));
      } finally {
        setLoading(false);
      }
    };
    fetchBooks();
  }, [targetLang]);

  // Restore persistent reading state when books load
  useEffect(() => {
    if (books.length === 0) return;
    try {
      const savedState = localStorage.getItem('spanglish_literature_last_state');
      if (savedState) {
        const parsed = JSON.parse(savedState);
        if (parsed.bookId) {
          const matchedBook = books.find(b => b.id === parsed.bookId);
          if (matchedBook) {
            handleSelectBook(matchedBook).then(() => {
              if (parsed.view === 'reader' && parsed.chapterId) {
                const bookChaps = LOCAL_FALLBACK_CHAPTERS[parsed.bookId] || [];
                const matchedChap = bookChaps.find(c => c.id === parsed.chapterId || c.chapter_number === parsed.chapterNumber);
                if (matchedChap) {
                  setSelectedChapter(matchedChap);
                  setCurrentView('reader');
                }
              } else if (parsed.view === 'chapters') {
                setCurrentView('chapters');
              }
            });
          }
        }
      }
    } catch (e) {
      console.warn('Failed to restore literature reading state:', e);
    }
  }, [books]);

  // Helper to persist reading state
  const persistState = (view: 'books' | 'chapters' | 'reader', book: BookType | null, chapter: ChapterType | null) => {
    try {
      localStorage.setItem('spanglish_literature_last_state', JSON.stringify({
        view,
        bookId: book ? book.id : null,
        chapterId: chapter ? chapter.id : null,
        chapterNumber: chapter ? chapter.chapter_number : null
      }));
    } catch (e) {}
  };

  // Fetch chapters and progress when a book is selected
  const handleSelectBook = async (book: BookType) => {
    setSelectedBook(book);
    setLoading(true);
    setCurrentView('chapters');
    persistState('chapters', book, null);

    try {
      // 1. Fetch chapters
      const chapRes = await fetch(getApiUrl(`/api/literature/book/${book.id}/chapters`));
      let chapData: ChapterType[] = [];
      if (chapRes.ok) {
        chapData = await chapRes.json();
      } else {
        chapData = LOCAL_FALLBACK_CHAPTERS[book.id] || [];
      }
      setChapters(chapData);

      // Check if we need to restore selected chapter
      const savedState = localStorage.getItem('spanglish_literature_last_state');
      if (savedState) {
        const parsed = JSON.parse(savedState);
        if (parsed.view === 'reader' && parsed.chapterId) {
          const matchedChap = chapData.find(c => c.id === parsed.chapterId || c.chapter_number === parsed.chapterNumber);
          if (matchedChap) {
            setSelectedChapter(matchedChap);
            setCurrentView('reader');
          }
        }
      }

      // 2. Fetch progress
      const userIdParam = user ? `?userId=${user.id}` : '';
      const progRes = await fetch(getApiUrl(`/api/literature/progress/${book.id}${userIdParam}`));
      if (progRes.ok) {
        const progData = await progRes.json();
        setProgress({
          completed_chapters: progData.completed_chapters || [],
          current_chapter: progData.current_chapter || 1
        });
      } else {
        const localProg = localStorage.getItem(`spanglish_progress_${book.id}`);
        if (localProg) {
          setProgress(JSON.parse(localProg));
        } else {
          setProgress({ completed_chapters: [], current_chapter: 1 });
        }
      }
    } catch (err) {
      console.warn('Using offline fallback chapters & progress:', err);
      const fallbackChaps = LOCAL_FALLBACK_CHAPTERS[book.id] || [];
      setChapters(fallbackChaps);
      
      const localProg = localStorage.getItem(`spanglish_progress_${book.id}`);
      if (localProg) {
        setProgress(JSON.parse(localProg));
      } else {
        setProgress({ completed_chapters: [], current_chapter: 1 });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChapter = (chapter: ChapterType) => {
    // Prevent opening locked chapters
    if (chapter.chapter_number > progress.current_chapter) return;
    setSelectedChapter(chapter);
    setCurrentView('reader');
    persistState('reader', selectedBook, chapter);
  };

  const handleCompleteChapter = async () => {
    if (!selectedBook || !selectedChapter) return;
    setCompleting(true);

    const chNum = selectedChapter.chapter_number;
    
    // Award book chapter activity score (+25 XP)
    recordActivity('chapter');

    try {
      const response = await fetch(getApiUrl('/api/literature/progress/complete'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id || null,
          bookId: selectedBook.id,
          chapterNumber: chNum
        })
      });

      if (response.ok) {
        const data = await response.json();
        setProgress({
          completed_chapters: data.completed_chapters || [],
          current_chapter: data.current_chapter || 1
        });
      } else {
        throw new Error('Server progress save failed');
      }
    } catch (err) {
      // Local fallback progression saving
      console.warn('Saving progress locally:', err);
      const completed = [...progress.completed_chapters];
      if (!completed.includes(chNum)) {
        completed.push(chNum);
      }
      const updated = {
        completed_chapters: completed,
        current_chapter: Math.max(progress.current_chapter, chNum + 1)
      };
      setProgress(updated);
      localStorage.setItem(`spanglish_progress_${selectedBook.id}`, JSON.stringify(updated));
    } finally {
      setCompleting(false);
      setCurrentView('chapters');
      setSelectedChapter(null);
    }
  };

  const speakLine = (text: string) => {
    if (!selectedBook) return;
    speakTextWithBestVoice(text, selectedBook.source_lang, speechRate);
  };

  // Helper to get level summary text
  const getLevelSummary = (chap: ChapterType) => {
    if (level === 'basic') return chap.summary_basic;
    if (level === 'intermediate') return chap.summary_intermediate;
    return chap.summary_advanced;
  };

  return (
    <div className="animate-slide-up" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', overflowY: 'auto' }}>
      
      {/* 1. BOOKS CAMPAIGN LIST VIEW */}
      {currentView === 'books' && (
        <>
          <div>
            <h2 style={{ fontSize: '22px', fontWeight: '800' }}>
              {nativeLanguage === 'es' ? 'Aventura Literaria' : 'Literature Adventure'}
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {nativeLanguage === 'es' 
                ? 'Elige un libro clásico y avanza capítulo por capítulo.' 
                : 'Select a classic novel campaign and unlock chapters as you read.'}
            </p>
          </div>

          {loading ? (
            <div style={{ display: 'flex', flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
              <div className="pulse-recording" style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary)' }} />
            </div>
          ) : books.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Book size={48} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
              <p>No novel campaigns found for your target language.</p>
              <p style={{ fontSize: '11px', marginTop: '4px' }}>Upload PDFs to `literature_pdfs/` and run `node scripts/ingest_literature.js` to seed novels.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {books.map(book => (
                <div 
                  key={book.id} 
                  className="glass-card" 
                  onClick={() => handleSelectBook(book)}
                  style={{ 
                    padding: '16px', 
                    cursor: 'pointer', 
                    transition: 'transform 0.2s ease, border-color 0.2s ease', 
                    border: '1px solid var(--border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.borderColor = 'var(--primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.borderColor = 'var(--border)';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Book size={18} color="var(--primary)" />
                      <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>{book.title}</h3>
                    </div>
                    <span style={{ 
                      fontSize: '9px', 
                      background: 'rgba(139, 92, 246, 0.15)', 
                      color: 'var(--primary)', 
                      padding: '2px 8px', 
                      borderRadius: '12px',
                      fontWeight: '800',
                      textTransform: 'uppercase'
                    }}>
                      {book.source_lang === 'es' ? 'Spanish' : 'English'}
                    </span>
                  </div>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>By {book.author}</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4', marginTop: '4px' }}>
                    {nativeLanguage === 'es' ? (book.synopsis_es || book.synopsis) : (book.synopsis_en || book.synopsis)}
                  </p>
                  
                  <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: '6px', fontSize: '12px', color: 'var(--primary)', fontWeight: '700' }}>
                    <span>Start Adventure</span>
                    <ChevronRight size={14} style={{ marginLeft: '2px' }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* 2. CHAPTERS PROGRESSION ADVENTURE MAP */}
      {currentView === 'chapters' && selectedBook && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button 
              onClick={() => setCurrentView('books')}
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '6px', cursor: 'pointer', display: 'flex', color: 'var(--text-primary)' }}
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <span style={{ fontSize: '10px', color: 'var(--primary)', fontWeight: '800', textTransform: 'uppercase' }}>Book Adventure Map</span>
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)' }}>{selectedBook.title}</h2>
            </div>
          </div>

          {/* Progress Banner */}
          <div className="glass-card" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase' }}>
              <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Trophy size={13} color="gold" /> Completion Progress
              </span>
              <span style={{ color: 'var(--primary)' }}>
                {chapters.length > 0 
                  ? `${Math.round((progress.completed_chapters.length / chapters.length) * 100)}%` 
                  : '0%'}
              </span>
            </div>
            <div style={{ width: '100%', height: '8px', background: 'var(--bg-app)', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border)' }}>
              <div 
                style={{ 
                  height: '100%', 
                  background: 'var(--primary-gradient)', 
                  width: `${chapters.length > 0 ? (progress.completed_chapters.length / chapters.length) * 100 : 0}%`,
                  transition: 'width 0.5s ease-out'
                }}
              />
            </div>
          </div>

          {/* Vertical adventure nodes list */}
          <div style={{ display: 'flex', flexDirection: 'column', position: 'relative', padding: '10px 0', gap: '20px' }}>
            
            {/* Vertical connector line */}
            <div style={{ 
              position: 'absolute', 
              left: '27px', 
              top: '25px', 
              bottom: '25px', 
              width: '2px', 
              background: 'var(--border)', 
              zIndex: 0 
            }} />

            {chapters.map((chapter, idx) => {
              const isCompleted = progress.completed_chapters.includes(chapter.chapter_number);
              const isActive = chapter.chapter_number === progress.current_chapter;
              const isLocked = chapter.chapter_number > progress.current_chapter;

              return (
                <div 
                  key={chapter.id || idx}
                  onClick={() => handleOpenChapter(chapter)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    zIndex: 1,
                    cursor: isLocked ? 'not-allowed' : 'pointer',
                    opacity: isLocked ? 0.6 : 1,
                    transition: 'all 0.2s ease'
                  }}
                >
                  {/* Node icon circle */}
                  <div style={{
                    width: '54px',
                    height: '54px',
                    borderRadius: '50%',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    background: isCompleted 
                      ? 'rgba(16, 185, 129, 0.15)' 
                      : isActive 
                        ? 'var(--primary-glow)' 
                        : 'var(--surface)',
                    border: isCompleted
                      ? '2px solid rgb(16, 185, 129)'
                      : isActive
                        ? '2.5px solid var(--primary)'
                        : '2px solid var(--border)',
                    boxShadow: isActive ? '0 0 12px var(--border-glow)' : 'none',
                    color: isCompleted ? 'rgb(16, 185, 129)' : isActive ? 'var(--primary)' : 'var(--text-muted)'
                  }}>
                    {isCompleted ? (
                      <CheckCircle size={22} />
                    ) : isActive ? (
                      <PlayCircle size={24} style={{ animation: 'voicePulse 1.2s infinite alternate' }} />
                    ) : (
                      <Lock size={20} />
                    )}
                  </div>

                  {/* Chapter description card */}
                  <div 
                    className="card"
                    style={{
                      flex: 1,
                      padding: '12px 14px',
                      background: isActive ? 'var(--surface)' : 'rgba(255,255,255,0.01)',
                      border: isActive ? '1px solid var(--border-glow)' : '1px solid var(--border)',
                      borderRadius: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '10px', color: isActive ? 'var(--primary)' : 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase' }}>
                        Chapter {chapter.chapter_number}
                      </span>
                      {isActive && (
                        <span style={{ fontSize: '9px', background: 'var(--primary)', color: 'white', padding: '1px 6px', borderRadius: '4px', fontWeight: '800' }}>
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <h4 style={{ fontSize: '13.5px', fontWeight: '700', color: 'var(--text-primary)' }}>
                      {chapter.title}
                    </h4>
                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.3', marginTop: '2px' }}>
                      {isLocked ? 'Complete preceding chapters to unlock details.' : chapter.synopsis}
                    </p>
                  </div>

                </div>
              );
            })}
          </div>
        </>
      )}

      {/* 3. CHAPTER READING & LESSON MODULE */}
      {currentView === 'reader' && selectedBook && selectedChapter && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button 
              onClick={() => {
                setCurrentView('chapters');
                setSelectedChapter(null);
              }}
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '6px', cursor: 'pointer', display: 'flex', color: 'var(--text-primary)' }}
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <span style={{ fontSize: '10px', color: 'var(--primary)', fontWeight: '800', textTransform: 'uppercase' }}>
                Chapter {selectedChapter.chapter_number} Reading
              </span>
              <h2 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)' }}>
                {selectedChapter.title}
              </h2>
            </div>
          </div>

          {/* Reader Configuration Panel */}
          <div className="glass-card" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {/* Layout switcher */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Layout</span>
                <div style={{ display: 'flex', background: 'var(--bg-app)', padding: '2px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <button
                    onClick={() => setLayoutMode('target')}
                    style={{
                      flex: 1,
                      background: layoutMode === 'target' ? 'var(--primary)' : 'transparent',
                      border: 'none',
                      color: 'white',
                      fontSize: '11px',
                      fontWeight: '600',
                      padding: '6px',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    Original
                  </button>
                  <button
                    onClick={() => setLayoutMode('translation')}
                    style={{
                      flex: 1,
                      background: layoutMode === 'translation' ? 'var(--primary)' : 'transparent',
                      border: 'none',
                      color: 'white',
                      fontSize: '11px',
                      fontWeight: '600',
                      padding: '6px',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    Interlinear
                  </button>
                </div>
              </div>

              {/* Font size controller */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Text Size</span>
                <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-app)', border: '1px solid var(--border)', borderRadius: '8px', height: '28px', padding: '0 4px', justifyContent: 'space-between' }}>
                  <button 
                    onClick={() => setFontSize(prev => Math.max(12, prev - 1))}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', width: '24px', height: '100%', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}
                  >
                    -
                  </button>
                  <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)' }}>{fontSize}px</span>
                  <button 
                    onClick={() => setFontSize(prev => Math.min(22, prev + 1))}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', width: '24px', height: '100%', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Speech Rate Adjustment */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>
                <span>🔊 Speech Speed</span>
                <span>{Math.round(speechRate * 100)}%</span>
              </div>
              <input 
                type="range" 
                min="0.5" 
                max="1.5" 
                step="0.05"
                value={speechRate}
                onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--primary)', background: 'var(--bg-app)', height: '4px', borderRadius: '2px', outline: 'none', cursor: 'pointer' }}
              />
            </div>
          </div>

          {/* Interactive Chapter Content */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '18px', background: 'var(--surface)' }}>
            
            {/* Story plot synopsis (in Native Language) */}
            <div style={{
              background: 'rgba(139, 92, 246, 0.04)',
              border: '1px solid rgba(139, 92, 246, 0.12)',
              padding: '12px',
              borderRadius: '12px',
              display: 'flex',
              gap: '8px',
              alignItems: 'flex-start'
            }}>
              <Info size={14} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ fontSize: '9px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '2px' }}>
                  Chapter Plot (Synopsis)
                </div>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                  {selectedChapter.synopsis}
                </p>
              </div>
            </div>

            {/* LEVEL-SPECIFIC target language reading details (Adventure Core) */}
            <div style={{
              background: 'rgba(255,255,255,0.01)',
              border: '1px solid var(--border)',
              padding: '12px',
              borderRadius: '12px',
              display: 'flex',
              gap: '8px',
              alignItems: 'flex-start'
            }}>
              <FileText size={14} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ fontSize: '9px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>Story Summary & Lessons ({level.toUpperCase()})</span>
                  <Sparkles size={10} color="gold" />
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-primary)', lineHeight: '1.5', fontStyle: 'normal' }}>
                  {getLevelSummary(selectedChapter)}
                </p>
              </div>
            </div>

            {/* Line-by-line reading exercises */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: '4px' }}>
              <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Key Lines and Lessons:
              </div>
              
              {selectedChapter.lines.map((line, idx) => {
                const isDual = layoutMode === 'translation';
                const isSideBySide = isDual && !isMobile;
                const isInterlinear = isDual && isMobile;

                return (
                  <div 
                    key={idx}
                    style={{
                      display: isSideBySide ? 'grid' : 'flex',
                      gridTemplateColumns: isSideBySide ? '1fr 1fr' : 'none',
                      flexDirection: 'column',
                      gap: isSideBySide ? '20px' : '4px',
                      alignItems: 'flex-start',
                      borderBottom: '1px dashed rgba(255, 255, 255, 0.03)',
                      paddingBottom: '8px'
                    }}
                  >
                    {/* Target Sentence Block */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', width: '100%' }}>
                      <button 
                        onClick={() => speakLine(line.target)}
                        style={{
                          background: 'var(--bg-app)',
                          border: '1px solid var(--border)',
                          color: 'var(--primary)',
                          padding: '4px',
                          borderRadius: '50%',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginTop: '2px',
                          flexShrink: 0
                        }}
                      >
                        <Volume2 size={11} />
                      </button>
                      <span style={{ 
                        fontSize: `${fontSize}px`, 
                        color: 'var(--text-primary)', 
                        lineHeight: '1.5',
                        fontFamily: 'serif'
                      }}>
                        {line.target}
                      </span>
                    </div>

                    {/* Translation blocks */}
                    {isSideBySide && (
                      <span style={{ 
                        fontSize: `${fontSize - 1}px`, 
                        color: 'var(--text-secondary)', 
                        lineHeight: '1.5',
                        borderLeft: '1px solid var(--border)',
                        paddingLeft: '12px',
                        fontStyle: 'italic'
                      }}>
                        {line.native}
                      </span>
                    )}

                    {isInterlinear && (
                      <span style={{ 
                        fontSize: `${fontSize - 2}px`, 
                        color: 'var(--text-muted)', 
                        lineHeight: '1.4',
                        paddingLeft: '23px',
                        fontStyle: 'italic'
                      }}>
                        {line.native}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

          </div>

          {/* Help Banner */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 12px',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            fontSize: '11px',
            color: 'var(--text-secondary)'
          }}>
            <HelpCircle size={14} color="var(--primary)" />
            <span>
              {nativeLanguage === 'es'
                ? '¿Ves una palabra difícil? Selecciónala para ver la traducción instantánea.'
                : 'Highlight any word or phrase on the screen to trigger translation overlays.'}
            </span>
          </div>

          {/* COMPLETE CHAPTER ACTION (only if it's the current active chapter in progression) */}
          {selectedChapter.chapter_number === progress.current_chapter && (
            <button
              onClick={handleCompleteChapter}
              disabled={completing}
              style={{
                width: '100%',
                background: 'var(--primary-gradient)',
                border: 'none',
                color: 'white',
                fontWeight: '700',
                fontSize: '14px',
                padding: '14px',
                borderRadius: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 6px 20px rgba(139, 92, 246, 0.3)',
                marginTop: '10px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
            >
              {completing ? (
                <>Completing...</>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>Complete Chapter & Continue Adventure 🚀</span>
                </>
              )}
            </button>
          )}
        </>
      )}

    </div>
  );
};
