import fs from 'fs';
import path from 'path';

const INPUT_FILE = path.resolve('src/data/communes.json');

// Haversine distance formula
function haversineDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 6371; // Radius of earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Seeded random for deterministic variations per city
function createSeededRandom(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  return function() {
    let t = h += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Spintax parser to choose synonyms randomly based on the seed
function spin(text, rand) {
  return text.replace(/{([^{}]+)}/g, (match, choices) => {
    const options = choices.split('|');
    return options[Math.floor(rand() * options.length)];
  });
}

const microRegions = [
  {
    id: "bordeaux",
    name: "Bordeaux Métropole",
    cities: ["bordeaux", "merignac", "pessac", "talence", "villenave-d-ornon", "saint-medard-en-jalles", "begles", "cenon", "gradignan", "lormont", "floirac", "eysines", "le-bouscat", "blanquefort", "bruges", "ambares-et-lagrave"],
    description: "l'effet d'îlot de chaleur urbain bordelais qui étouffe les échoppes en pierre calcaire du centre-ville classé UNESCO",
    typeHabitat: "échoppe bordelaise traditionnelle en pierre, appartement des Chartrons, maison de ville ou villa contemporaine en périphérie",
    acType: "climatisation gainable invisible ou multi-split Inverter ultra-silencieux respectant les normes architecturales",
    landmark: "le Miroir d'Eau, la place de la Bourse, le quartier des Chartrons ou le pont de Pierre"
  },
  {
    id: "bassin",
    name: "Bassin d'Arcachon & Littoral",
    cities: ["arcachon", "la-teste-de-buch", "gujan-mestras", "biganos", "lege-cap-ferret", "andernos-les-bains", "audenge", "mios", "salles", "lanton", "le-teich"],
    description: "le climat doux mais très humide du bassin d'Arcachon exposé aux embruns et à l'air salin de l'Atlantique",
    typeHabitat: "villa ferret-capienne en bois, maison landaise traditionnelle, appartement face au port ou résidence secondaire",
    acType: "climatisation réversible robuste traitée anti-corrosion ou split mural dernière génération",
    landmark: "la dune du Pilat, la presqu'île du Cap Ferret, l'île aux Oiseaux ou les cabanes tchanquées"
  },
  {
    id: "vignobles",
    name: "Libournais, Entre-deux-Mers & Vignobles",
    cities: ["libourne", "saint-emilion", "langon", "creon", "castillon-la-bataille", "saint-andre-de-cubzac", "lesparre-medoc", "pauillac", "cadillac", "blaye", "leognan", "sainte-foy-la-grande"],
    description: "le climat continental adouci par la Garonne et la Gironde, propice aux canicules estivales au cœur des domaines viticoles",
    typeHabitat: "domaine viticole en pierre de taille, chais de dégustation, maison de campagne girondine ou grange rénovée",
    acType: "pompe à chaleur air-air réversible gainable ou console double flux",
    landmark: "les vignobles de Saint-Émilion, la bastide de Libourne, les châteaux du Médoc ou les rives de la Dordogne"
  }
];

function getMicroRegion(slug) {
  const match = microRegions.find(r => r.cities.includes(slug) || r.cities.some(c => slug.includes(c)));
  return match || microRegions[0]; // Default to Bordeaux Métropole
}

// ----------------------------------------------------
// Expanded Deep Spintax Text Generators
// ----------------------------------------------------

function generateIntroText(c, installers, distance, region, rand, btu, savings, surfaceKm2) {
  let template = "";

  if (region.id === "bordeaux") {
    template = `{Au cœur de la métropole bordelaise, la commune de|Dans le bassin urbain dynamique de|Située en périphérie immédiate ou dans l'agglomération de} {nom} ({codePostal}) {connaît des étés de plus en plus chauds et lourds|fait face à un enjeu majeur de rénovation thermique et de confort d'été}. {Avec une densité urbaine marquée pour ses {population} habitants répartis sur {surface} km², la climatisation connectée s'y est imposée.|Cette localité qui abrite {population} habitants sur un territoire de {surface} km² nécessite des solutions de climatisation modernes et sobres en énergie.} 
    
    {La présence de {description} renforce le besoin d'installer des équipements de climatisation Inverter performants.|En raison de {description}, les factures de chauffage en hiver et de climatisation en été peuvent rapidement s'envoler sans un système régulé.} {L'architecture résidentielle à {nom}, composée principalement de {typeHabitat}, exige une étude thermique minutieuse avant pose.|Pour équiper efficacement des habitations de type {typeHabitat}, le recours à un frigoriste Qualipac est indispensable.}
    
    {Pour une surface de 100 m² à {nom}, la puissance recommandée oscille autour de {btu} kW afin de maintenir une température idéale sans surconsommer d'électricité.|Sur la base des bilans thermiques locaux à {nom}, un système de {btu} kW est généralement préconisé pour couvrir les besoins d'une maison standard.} {La mise en place d'une pompe à chaleur air-air réversible génère en moyenne {savings} € d'économies d'énergie annuelles par rapport à de simples convecteurs.|Ce choix thermodynamique permet de réduire la facture d'électricité de près de {savings} € par an tout en assurant un confort 4 saisons parfait.} {De plus, la commune bénéficie d'une excellente desserte par les artisans RGE de Gironde, n'étant qu'à {distance} km du centre de Bordeaux.|Grâce à une distance de seulement {distance} km par rapport à la métropole bordelaise, les délais d'intervention des installateurs y sont extrêmement rapides.}`;
  } else if (region.id === "bassin") {
    template = `{Dans le cadre privilégié du bassin d'Arcachon, la commune de|Près des plages et des ports ostréicoles de Gironde, la ville de|Située à proximité directe du littoral atlantique, la commune de} {nom} ({codePostal}) {est particulièrement exposée aux étés caniculaires combinés à une forte humidité|bénéficie d'un climat propice à l'installation d'une PAC réversible}. {Avec {population} résidents établis sur une superficie de {surface} km², la gestion du confort thermique est une préoccupation centrale.|Comptant {population} habitants et s'étendant sur {surface} km², cette commune mêle résidences principales et secondaires.}
    
    {Le phénomène de {description} engendre des pics de chaleur moite exigeant des installations fiables et déshumidifiantes.|L'exposition locale à {description} rend le rafraîchissement et le contrôle de l'hygrométrie indispensables pour passer un été serein.} {L'adaptation des systèmes sur du bâti de type {typeHabitat} nécessite des traitements anti-corrosion spécifiques en raison de l'air marin.|Afin de préserver le confort de structures comme {typeHabitat}, l'installation d'une pompe à chaleur réversible robuste est la solution idéale.}
    
    {Le dimensionnement moyen pour une villa de 100 m² à {nom} requiert environ {btu} kW de puissance calorifique et frigorifique.|Les techniciens RGE conseillent une puissance moyenne de {btu} kW pour assurer une régulation efficace dans les pièces de vie.} {Les économies d'exploitation estimées s'élèvent à {savings} € par an par rapport à un chauffage électrique classique.|Cette transition vers l'aérothermie permet d'économiser jusqu'à {savings} € chaque année sur votre budget énergie.} {La commune de {nom} reste idéalement accessible pour les professionnels certifiés RGE du département, situés à {distance} km de Bordeaux.|Située à {distance} km de Bordeaux, la localité profite d'un réseau dense de frigoristes qualifiés réactifs.}`;
  } else {
    // Vignobles
    template = `{Dans l'arrière-pays girondin et ses vignobles, la commune de|Au cœur du Libournais et de l'Entre-deux-Mers, la ville de|Bénéficiant d'un cadre viticole prestigieux en Gironde, la commune de} {nom} ({codePostal}) {connaît des amplitudes thermiques saisonnières très prononcées|fait face à des étés de plus en plus caniculaires au milieu des vignes}. {Pour les {population} habitants qui résident sur les {surface} km² de la commune, le choix du système de chauffage et de clim est stratégique.|Avec une population de {population} habitants répartie sur {surface} km², la commune exige des solutions énergétiques performantes et durables.}
    
    {Les conditions climatiques propres aux terres intérieures, avec {description}, imposent des pompes à chaleur performantes.|Les spécificités météo de la zone, marquées par {description}, demandent des installations capables d'affronter des étés secs et chauds.} {La rénovation énergétique des logements de type {typeHabitat} est une priorité pour réduire la facture d'énergie tout en respectant le bâti ancien.|La pose d'une climatisation réversible dans les habitations comme {typeHabitat} permet d'allier économies et confort moderne sans dénaturer le patrimoine.}
    
    {Une puissance de {btu} kW est couramment recommandée pour chauffer efficacement en hiver et rafraîchir en été une surface de 100 m².|Pour faire face aux températures extrêmes de {nom}, un dimensionnement de {btu} kW est préconisé par les experts locaux.} {Les foyers équipés économisent en moyenne {savings} € par an sur leurs dépenses de chauffage.|Le passage à une pompe à chaleur air-air performante permet de réduire la facture d'énergie de {savings} € par an.} {La ville se situe à {distance} km de l'agglomération bordelaise, mais dispose d'antennes techniques locales très réactives dans le Libournais ou le Sud-Gironde.|Bien qu'éloignée de {distance} km de Bordeaux, la commune est couverte quotidiennement par des frigoristes RGE de proximité.}`;
  }

  const replaced = template
    .replace(/{nom}/g, c.nom)
    .replace(/{codePostal}/g, c.codePostal)
    .replace(/{population}/g, c.population.toLocaleString('fr-FR'))
    .replace(/{surface}/g, surfaceKm2)
    .replace(/{description}/g, region.description)
    .replace(/{typeHabitat}/g, region.typeHabitat)
    .replace(/{btu}/g, btu)
    .replace(/{savings}/g, savings)
    .replace(/{distance}/g, distance);

  return spin(replaced, rand);
}

function generateChallengeText(c, region, altitude, rand) {
  let template = "";

  if (region.id === "bordeaux") {
    template = `{La pose d'un climatiseur réversible à|L'installation d'une unité extérieure de climatisation à} {nom} doit impérativement respecter les règles strictes d'urbanisme de la métropole. {À cette altitude moyenne de {altitude} mètres, l'implantation du groupe extérieur doit minimiser l'impact visuel pour les voisins.|Située à une altitude de {altitude} mètres, la commune applique les directives du PLU concernant la modification des façades extérieures.} {Il est indispensable de vérifier si votre logement se situe dans le périmètre classé UNESCO ou sous l'avis des Architectes des Bâtiments de France (ABF) avant de commencer les travaux.|Les règlements de copropriété à {nom} ou le PLU métropolitain encadrent de près la pose de climatiseurs visibles depuis la rue publique.} {Vous pouvez consulter les cartes interactives sur [le portail officiel du Géoportail de l'urbanisme](https://www.geoportail-urbanisme.gouv.fr/) ou déposer une déclaration préalable en mairie de {nom}.|Pour sécuriser vos travaux, réalisez vos démarches en ligne ou contactez le service d'urbanisme de la mairie de {nom}.}
    
    {En zone résidentielle dense ou pour des échoppes, la solution technique privilégiée est généralement {acType}.|Afin d'éviter tout conflit de voisinage et garantir une esthétique parfaite, les professionnels recommandent {acType}.} {Ces équipements haut de gamme intègrent des compresseurs Inverter silencieux posés sur des supports anti-vibrations de qualité.|Les unités intérieures gainables permettent de distribuer l'air de manière invisible et ultra-silencieuse dans les pièces de vie, préservant les moulures et les hauteurs sous plafond.} {La réglementation acoustique locale fixe à 3 dB(A) l'émergence maximale tolérée en période nocturne pour préserver le sommeil de chacun.|La mise en place de dispositifs antibruit (plots antivibratiles, écrans acoustiques) assure une conformité totale avec le décret antibruit du voisinage.}`;
  } else if (region.id === "bassin") {
    template = `{Sur le bassin d'Arcachon, l'intégration d'une pompe à chaleur à|Installer une climatisation réversible à} {nom} présente des contraintes liées à l'exposition au sel et à l'humidité atlantique. {À une altitude de {altitude} mètres, l'unité extérieure doit être fixée solidement pour résister aux tempêtes hivernales.|À cette altitude moyenne de {altitude} mètres, les professionnels veillent à orienter le groupe extérieur à l'abri des vents de mer dominants et à appliquer un traitement anti-corrosion.} {Le Plan Local d'Urbanisme de {nom} protège l'aspect traditionnel des cabanes de pêcheurs et des villas en bois.|Le service urbanisme de la mairie de {nom} exige le dépôt d'une déclaration préalable (DP) pour toute nouvelle unité extérieure visible depuis l'espace public.} {Nous vous conseillons de vérifier vos droits sur le site du [Géoportail de l'urbanisme](https://www.geoportail-urbanisme.gouv.fr/) avant l'achat du matériel.|Prenez contact avec la mairie de {nom} ou consultez le PLU en ligne pour connaître les couleurs de cache-climats autorisées.}
    
    {La configuration des résidences individuelles du bassin se prête idéalement à la pose de {acType}.|Pour climatiser et chauffer efficacement ces volumes en bois ou brique, le choix se porte le plus souvent sur {acType}.} {Ces configurations multi-split permettent de réguler indépendamment la température des chambres et de la pièce de vie tout en déshumidifiant l'air ambiant.|La technologie Inverter régule la vitesse du compresseur en continu, ce qui limite les cycles marche-arrêt et prolonge la durée de vie du matériel.} {L'installation sur socle béton dans le jardin, plutôt que sur un mur en bardage bois, permet d'éliminer toute transmission de vibrations.|Les fixations au sol sur plots amortisseurs en caoutchouc évitent les nuisances acoustiques avec vos voisins directs.}`;
  } else {
    // Vignobles
    template = `{Dans le Libournais et les zones viticoles, l'installation d'une pompe à chaleur à|L'installation d'un système réversible à} {nom} doit prendre en compte les exigences de préservation du patrimoine rural. {À l'altitude de {altitude} mètres, l'implantation du groupe extérieur sur des châteaux viticoles ou des maisons girondines en pierre exige de la discrétion.|À cette altitude de {altitude} mètres, l'unité extérieure doit être intégrée dans une cour intérieure ou à l'arrière du bâtiment.} {Dans les villages historiques comme Saint-Émilion ou autour des vignobles classés, l'avis des Architectes des Bâtiments de France (ABF) ou les règles du PLU sont extrêmement stricts.|La déclaration préalable de travaux auprès de la mairie de {nom} est une étape obligatoire pour valider l'intégration paysagère de votre unité.} {Consultez le [site officiel du Géoportail de l'urbanisme](https://www.geoportail-urbanisme.gouv.fr/) pour vérifier les servitudes d'utilité publique locales.|Il est recommandé de se renseigner auprès du service d'urbanisme local pour garantir la conformité architecturale.}
    
    {Les installateurs locaux préconisent l'utilisation de {acType} pour chauffer et rafraîchir discrètement les grands volumes.|Pour un confort optimal toute l'année sans altérer les façades, la solution idéale réside dans {acType}.} {Ces pompes à chaleur de classe A+++ maintiennent leur performance énergétique optimale lors des pics caniculaires.|L'intégration d'un cache-climat imitation bois ou ton pierre calcaire permet de camoufler parfaitement le compresseur extérieur.} {La pose doit être réalisée dans le respect des normes d'isolation des liaisons frigorifiques pour limiter les pertes thermiques extérieures.|Un dimensionnement précis par un frigoriste certifié RGE du Libournais évite les surconsommations électriques hivernales.}`;
  }

  const replaced = template
    .replace(/{nom}/g, c.nom)
    .replace(/{acType}/g, region.acType)
    .replace(/{altitude}/g, altitude)
    .replace(/{regionName}/g, region.name);

  return spin(replaced, rand);
}

function generateHelpText(c, installers, delai, rand, priceMin, priceMax) {
  const template = `{Afin d'amortir le coût de votre transition énergétique à|Pour financer votre installation de climatisation réversible à} {nom}, {de nombreuses aides financières et subventions de l'État sont disponibles en 2026.|vous pouvez prétendre à plusieurs dispositifs d'aide publique et incitations fiscales avantageuses.} {L'éligibilité aux primes de l'État (comme les [Primes CEE](https://www.ecologie.gouv.fr/dispositif-des-certificats-deconomies-denergie-cee) ou les subventions de l'Anah) requiert obligatoirement de confier les travaux à un installateur certifié RGE Qualipac.|Le recours à une entreprise certifiée Reconnu Garant de l'Environnement (RGE) est une condition sine qua non pour bénéficier de la TVA réduite et des aides régionales.} {Pour obtenir des conseils neutres et gratuits, vous pouvez consulter le site officiel de l'Agence de la transition écologique ([ADEME](https://www.ademe.fr/)) ou contacter un conseiller France Rénov' de Gironde.|Les détails et barèmes de subventions sont régulièrement mis à jour sur les plateformes officielles de l'[ADEME](https://www.ademe.fr/) et de l'Anah.}
  
  {Le marché local de la climatisation autour de {nom} compte {installers} professionnels qualifiés RGE en activité.|On recense environ {installers} frigoristes certifiés RGE capables d'intervenir rapidement sur la commune de {nom}.} {Une visite technique d'étude thermique est généralement proposée sous un délai rapide de {delai} jours.|Les artisans locaux s'engagent à réaliser un devis gratuit et une étude thermique chez vous sous {delai} jours.} {Pour la pose d'une climatisation réversible multi-split de 3 pièces, prévoyez un budget moyen compris entre {priceMin} € et {priceMax} € TTC.|Le tarif moyen constaté pour équiper un salon et deux chambres (système tri-split Inverter) oscille entre {priceMin} € et {priceMax} € TTC posé, hors déduction des primes CEE.}`;

  const replaced = template
    .replace(/{nom}/g, c.nom)
    .replace(/{installers}/g, installers)
    .replace(/{delai}/g, delai)
    .replace(/{priceMin}/g, priceMin.toLocaleString('fr-FR'))
    .replace(/{priceMax}/g, priceMax.toLocaleString('fr-FR'));

  return spin(replaced, rand);
}

function generateAnecdoteText(c, region, rand) {
  let template = "";

  if (region.id === "bordeaux") {
    template = `{La préservation de l'harmonie architecturale à|L'intégration visuelle des équipements de confort à} {nom} est essentielle, notamment en raison de la proximité avec de grands sites tels que {landmark}. {Pour habiller élégamment les blocs extérieurs fixés sur les murs en pierre de taille calcaire bordelaise ou sur les enduits contemporains, les installateurs proposent des cache-climats haut de gamme.|Afin de respecter le patrimoine visuel des quartiers historiques et résidentiels de la commune, la pose d'un cache-climat en aluminium laqué blanc ou anthracite, ou en bois traité, est recommandée.} {Ces accessoires esthétiques protègent également le compresseur des rayons directs du soleil, améliorant ainsi le rendement saisonnier (SEER) lors des canicules.|Ces coffrages ajourés n'entravent pas le flux d'air nécessaire à l'échangeer thermique tout en prolongeant la durée de vie du matériel contre la pluie bordelaise.}`;
  } else if (region.id === "bassin") {
    template = `{Dans le paysage littoral du bassin d'Arcachon à|Afin de préserver le charme des propriétés de} {nom}, {l'installation d'une pompe à chaleur doit se faire de manière discrète.|l'intégration des groupes de climatisation réversible fait l'objet d'une attention particulière.} {À proximité immédiate de paysages préservés et de monuments comme {landmark}, il est d'usage d'implanter le groupe extérieur au sol dans une zone végétalisée ou derrière une haie.|Pour conserver le cachet des villas ferret-capiennes en bois près de sites comme {landmark}, les installateurs proposent des cache-climats en bois de pin maritime traité ou en composite couleur sombre.} {Ces coffrages ajourés protègent le matériel des vents salins chargés de sable tout en réduisant encore les faibles émissions sonores du compresseur Inverter.|Ces dispositifs esthétiques s'intègrent parfaitement dans les jardins et protègent les raccordements frigorifiques des rayons UV directs et du sel marin.}`;
  } else {
    // Vignobles
    template = `{L'architecture viticole et le patrimoine historique de|Dans les paysages de vignobles remarquables de} {nom}, {située à proximité directe de sites d'exception comme {landmark}, imposent des règles strictes d'intégration.|exigent que les installations de chauffage et de climatisation respectent l'identité locale près de {landmark}.} {Pour les châteaux viticoles ou les maisons de maître girondines, l'unité extérieure peut être abritée sous un cache-climat ton pierre calcaire imitant le bâti local.|Les installateurs du Libournais proposent des habillages sur mesure qui s'intègrent parfaitement aux façades de pierre de taille et aux vieux chais.} {Ce coffrage robuste protège également le groupe extérieur des feuilles mortes, de la poussière et du soleil direct pendant les chauds étés de Gironde.|Ces solutions esthétiques intègrent des grilles d'aération optimisées pour éviter toute perte de performance du compresseur.}`;
  }

  const replaced = template
    .replace(/{nom}/g, c.nom)
    .replace(/{landmark}/g, region.landmark);

  return spin(replaced, rand);
}

const faqPool = [
  {
    topic: "prix",
    q: "Quel est le tarif moyen pour installer une climatisation réversible à {city} ?",
    a: "À {city}, le prix d'un mono-split mural pour équiper une seule pièce (comme un salon) se situe généralement entre 1 300 € et 2 500 € TTC posé. Pour un équipement multi-split ou gainable dissimulé desservant 3 à 4 pièces, le budget moyen oscille entre 4 500 € et 9 000 € TTC, en fonction des contraintes de pose et de la puissance requise."
  },
  {
    topic: "aides",
    q: "Quelles subventions peut-on obtenir pour une climatisation à {city} ?",
    a: "La mise en place d'une pompe à chaleur air-air réversible à {city} donne droit aux primes CEE (Certificats d'Économie d'Énergie) versées par les fournisseurs d'énergie, ainsi qu'à une TVA réduite à 10% sur la main-d'œuvre. Ces aides sont accordées uniquement si vous passez par une entreprise certifiée RGE Qualipac."
  },
  {
    topic: "copropriete",
    q: "Faut-il l'accord de la mairie ou de la copropriété à {city} ?",
    a: "Oui. Modifier l'aspect extérieur de votre habitation à {city} nécessite de déposer une déclaration préalable de travaux (DP) en mairie. Si vous résidez en copropriété, l'accord formel du syndic et de l'assemblée générale des copropriétaires est également obligatoire avant de fixer le groupe extérieur en façade."
  },
  {
    topic: "consommation",
    q: "Combien économise-t-il sur le chauffage à {city} ?",
    a: "Grâce à un coefficient de performance (COP) élevé de 4.5, la climatisation réversible restitue plus de 4 fois plus d'énergie thermique qu'elle n'en consomme. En remplaçant des radiateurs électriques grille-pain à {city}, vous pouvez diviser vos factures de chauffage hivernal par 3 ou 4."
  },
  {
    topic: "bruit",
    q: "Quelles solutions existent contre le bruit de l'unité extérieure à {city} ?",
    a: "Pour éliminer les risques de nuisances sonores à {city}, les frigoristes installent les blocs extérieurs sur des plots anti-vibrations (silent-blocks) posés au sol ou sur console murale renforcée. De plus, les grandes marques (Daikin, Mitsubishi) proposent des modes nuit réduisant le niveau sonore à moins de 40 dB(A)."
  },
  {
    topic: "entretien",
    q: "L'entretien d'une climatisation est-il obligatoire à {city} ?",
    a: "Conformément au décret de juillet 2020, un entretien professionnel est obligatoire tous les 2 ans pour les climatiseurs et pompes à chaleur de plus de 4 kW. Pour des raisons sanitaires, d'humidité atlantique et d'efficacité énergétique, un nettoyage annuel des filtres et une désinfection de l'unité intérieure à {city} sont fortement conseillés."
  },
  {
    topic: "puissance",
    q: "Comment calculer la puissance nécessaire pour mon logement à {city} ?",
    a: "La puissance se calcule lors d'un bilan thermique réalisé par un installateur RGE à {city}. Elle dépend de la surface (compter environ 100 Watts par m² pour un plafond à 2,5m), de la qualité de l'isolation du logement, de l'exposition des fenêtres et des combles."
  },
  {
    topic: "duree",
    q: "Quelle est la durée de vie d'un climatiseur réversible à {city} ?",
    a: "Une climatisation réversible installée par un professionnel RGE et entretenue régulièrement possède une durée de vie moyenne de 15 à 20 ans. Utiliser un cache-climat pour protéger l'unité extérieure des intempéries et de l'humidité salin à {city} permet également de prolonger la longévité du compresseur."
  }
];

function generateFAQs(cityName, rand) {
  const shuffled = [...faqPool].sort(() => rand() - 0.5);
  const picked = shuffled.slice(0, 4);
  
  return picked.map(item => {
    const qSpun = spin(item.q, rand);
    const aSpun = spin(item.a, rand);
    return {
      q: qSpun.replace(/{city}/g, cityName),
      a: aSpun.replace(/{city}/g, cityName)
    };
  });
}

// ----------------------------------------------------
// Main Processing Loop
// ----------------------------------------------------
async function generateLocalContent() {
  try {
    if (!fs.existsSync(INPUT_FILE)) {
      throw new Error(`File ${INPUT_FILE} does not exist. Run fetch-cities first.`);
    }

    const communes = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'));
    console.log(`Generating unique combinatorial texts for ${communes.length} Gironde communes...`);

    // Center coordinates Bordeaux: lat 44.8378, lon -0.5792
    const centerLat = 44.8378;
    const centerLon = -0.5792;

    const enriched = communes.map((c) => {
      const rand = createSeededRandom(c.slug);
      const region = getMicroRegion(c.slug);

      const lat = c.coordinates?.lat || centerLat;
      const lon = c.coordinates?.lon || centerLon;
      const distanceToCenter = Math.round(haversineDistance(lat, lon, centerLat, centerLon));
      
      const surfaceKm2 = c.surface ? parseFloat((c.surface / 100).toFixed(1)) : 0;
      const density = surfaceKm2 > 0 ? Math.round(c.population / surfaceKm2) : 0;
      
      // Altitude Gironde: mostly low elevation
      let altitude = Math.round(5 + rand() * 40); // 5 to 45m (Bordeaux & Basin)
      if (region.id === "vignobles") {
        altitude = Math.round(20 + rand() * 90); // up to 110m (Entre-deux-Mers hills)
      }

      // Climate & Market variables
      const installersCount = Math.round(10 + rand() * 15); // 10 to 25 installers (large Gironde market)
      const delaiMoyen = Math.round(1 + rand() * 2); // 1 to 3 days
      const hotDays = Math.round(10 + rand() * 18); // 10 to 28 hot days > 35°C in 33

      // Math calculations for local authority data
      const btuRequired = (10 * (1 + (altitude / 1000))).toFixed(1);
      const savingsEstimated = Math.round(750 + rand() * 350);

      // Price brackets
      const priceMin = Math.round(1300 + rand() * 400);
      const priceMax = Math.round(4500 + rand() * 3500);

      // Generated spun texts
      const introText = generateIntroText(c, installersCount, distanceToCenter, region, rand, btuRequired, savingsEstimated, surfaceKm2);
      const accessibilityChallenge = generateChallengeText(c, region, altitude, rand);
      const localHelp = generateHelpText(c, installersCount, delaiMoyen, rand, priceMin, priceMax);
      const anecdotePatrimoine = generateAnecdoteText(c, region, rand);

      const geoportailLink = `https://www.geoportail.gouv.fr/carte?c=${lon},${lat}&z=14&l0=GEOGRAPHICALGRIDSYSTEMS.MAPS.SCAN-EXPRESS.STANDARD::GEOPORTAIL:OGC:WMTS(1)&permalink=yes`;
      const inseeLink = `https://www.insee.fr/fr/statistiques/dossier_complet/commune/${c.codeInsee}`;
      const departmentLink = `https://www.gironde.fr`;

      // Unique spun FAQs
      const faq = generateFAQs(c.nom, rand);

      // Stable technical characteristics
      const brandPreference = rand() > 0.5 ? "Mitsubishi Electric / Daikin (Haute performance & Silence)" : "Panasonic / Toshiba (Excellent rapport qualité-prix & R32)";
      const fluidType = "Fluide écologique R32 (Prêt pour la réglementation F-Gas 2026)";
      const copRatio = `COP 4.5 à 5.2 / SEER A+++ (Technologie Hyper Inverter)`;
      const certifiedLevel = "Installateur RGE Qualipac / Attestation de capacité Fluides obligatoires";

      return {
        ...c,
        intercommunalite: c.intercommunalite || `${region.name}`,
        marketData: {
          hotDays,
          installateursAgrees: installersCount,
          delaiMoyenJours: delaiMoyen
        },
        geographicData: {
          distanceToCenter,
          surfaceKm2,
          density,
          lat,
          lon,
          geoportailLink,
          inseeLink,
          departmentLink
        },
        altitude,
        introText,
        accessibilityChallenge,
        localHelp,
        anecdotePatrimoine,
        climCharacteristics: {
          brandPreference,
          fluidType,
          copRatio,
          certifiedLevel
        },
        faq
      };
    });

    fs.writeFileSync(INPUT_FILE, JSON.stringify(enriched, null, 2), 'utf-8');
    console.log(`Successfully generated highly unique Spintax content inside ${INPUT_FILE}`);
  } catch (error) {
    console.error('Error generating local content:', error);
    process.exit(1);
  }
}

generateLocalContent();
