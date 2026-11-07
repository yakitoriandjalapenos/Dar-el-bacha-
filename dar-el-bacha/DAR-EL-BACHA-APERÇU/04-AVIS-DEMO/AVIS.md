# Témoignages — AVIS FICTIFS DE DÉMONSTRATION

Document généré par `npm run apercu` à partir de `src/content/reviews.json` (le fichier qui fait foi ; copie dans ce dossier).

Ces 6 avis sont **inventés pour l'aperçu**. Ils ne citent aucun client réel, aucune date de visite, aucune note
Google ni statistique. Le site les affiche sous la mention « Avis fictifs — aperçu de démonstration » (EN : « Fictitious reviews — demonstration preview » ;
AR : « آراء وهمية — معاينة تجريبية ») et la mise en production est refusée tant que `"demo": true`.

## Remplacer par de vrais avis

1. Ouvrir `src/content/reviews.json`.
2. Remplacer chaque élément de `items` : `text` et `context` en français, anglais et arabe, `rating` (1 à 5),
   `author` facultatif (ex. prénom et initiale, avec l'accord de la personne).
3. Passer `"demo"` à `false` : la mention « avis fictifs » disparaît.
4. `npm run build` vérifie le fichier ; `npm run apercu` met ce document à jour.

## Les avis

### 1. Dîner en famille — ★★★★★

- FR : « Une pastilla d'une grande finesse et un service plein d'attention : on se sent reçu comme dans une maison de famille. »
- EN : “A pastilla of real finesse and wonderfully attentive service: you feel welcomed as if into a family home.” (Family dinner)
- AR : « بسطيلة بالغة الرقة وخدمة مليئة بالعناية: تشعر وكأنك ضيف في بيت العائلة. » (عشاء عائلي)

### 2. Soirée à deux — ★★★★★

- FR : « Le tajine d'agneau aux pruneaux, fondant et parfumé, valait à lui seul le détour. Une soirée douce et raffinée. »
- EN : “The lamb tagine with prunes, tender and fragrant, was worth the visit on its own. A gentle, refined evening.” (Evening for two)
- AR : « طاجين لحم الغنم بالبرقوق، طري وعطر، يستحق الزيارة وحده. سهرة هادئة وراقية. » (سهرة لشخصين)

### 3. Déjeuner d'affaires — ★★★★★

- FR : « Un déjeuner d'affaires parfaitement orchestré : un rythme juste, des conseils avisés sur la carte et un thé servi dans les règles de l'art. »
- EN : “A perfectly orchestrated business lunch: well-judged pacing, thoughtful advice on the menu and tea served the proper way.” (Business lunch)
- AR : « غداء عمل منظَّم بإتقان: إيقاع مضبوط، ونصائح موفقة حول القائمة، وشاي يُقدَّم وفق الأصول. » (غداء عمل)

### 4. Voyageurs de passage à Casablanca — ★★★★★

- FR : « Nous découvrions la cuisine marocaine : chaque plat nous a été présenté avec soin et patience. Une très belle première fois. »
- EN : “It was our first taste of Moroccan cuisine: every dish was introduced to us with care and patience. A wonderful first time.” (Travellers visiting Casablanca)
- AR : « كانت أول تجربة لنا مع المطبخ المغربي: قُدِّم لنا كل طبق بعناية وصبر. تجربة أولى رائعة. » (مسافرون في زيارة للدار البيضاء)

### 5. Anniversaire — ★★★★☆

- FR : « Les desserts à la fleur d'oranger concluent le repas avec délicatesse. Seul regret : ne plus avoir de place pour tout goûter. »
- EN : “The orange-blossom desserts close the meal with delicacy. Our only regret: having no room left to taste everything.” (Birthday celebration)
- AR : « الحلويات بماء الزهر تختم الوجبة برقة. أسفنا الوحيد أننا لم نعد قادرين على تذوق كل شيء. » (احتفال بعيد ميلاد)

### 6. Soirée entre amis — ★★★★★

- FR : « Des saveurs franches, une table généreuse et une atmosphère chaleureuse. Une adresse que nous recommandons volontiers. »
- EN : “Honest flavours, a generous table and a warm atmosphere. A place we are happy to recommend.” (Evening with friends)
- AR : « نكهات أصيلة ومائدة سخية وأجواء دافئة. عنوان نوصي به بكل سرور. » (سهرة مع الأصدقاء)
