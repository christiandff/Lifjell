// Fjelltopper på Lifjell-platået — begrenset til området mellom E134, RV36 og RV3330
// Koordinater fra OpenStreetMap Overpass API
// Sortert høyest til lavest

const FJELL_DATA = [
  { id:  1, navn: "Mælefjell",        hoyde: 1414, lat: 59.56179, lng: 8.71494, kommune: "Hjartdal",           beskrivelse: "Lifjells høyeste punkt — 1 414 moh. Stor og dominerende topp i vest.",    bilde: null },
  { id:  2, navn: "Steinfjellet",      hoyde: 1398, lat: 59.54843, lng: 8.73492, kommune: "Hjartdal",           beskrivelse: "Imponerende topp vest på platået. Bratt og krevende.",                    bilde: null },
  { id:  3, navn: "Røysdalsnuten",     hoyde: 1291, lat: 59.51874, lng: 8.77924, kommune: "Hjartdal",           beskrivelse: "Markert tind med fantastisk utsikt. Krevende bestigning.",                 bilde: null },
  { id:  4, navn: "Troganatten",       hoyde: 1287, lat: 59.48800, lng: 8.85853, kommune: "Hjartdal / Bø",     beskrivelse: "Høy og eksponert topp sentralt på platået.",                              bilde: null },
  { id:  5, navn: "Jøronnatten",       hoyde: 1276, lat: 59.49011, lng: 8.88721, kommune: "Bø",                 beskrivelse: "Fysisk krevende — belønner med en av Telemarks beste utsikter.",          bilde: null },
  { id:  6, navn: "Blåtjønnfjell",     hoyde: 1260, lat: 59.56472, lng: 8.77552, kommune: "Hjartdal",           beskrivelse: "Fin høyfjellstopp nord på Lifjell med utsikt mot Blåtjønn.",              bilde: null },
  { id:  7, navn: "Blåtjønnfjellet",   hoyde: 1234, lat: 59.56924, lng: 8.79101, kommune: "Hjartdal",           beskrivelse: "Nordlig topp på Lifjell-massivet nær Blåtjønn.",                          bilde: null },
  { id:  8, navn: "Astridnatten",      hoyde: 1215, lat: 59.47815, lng: 8.80728, kommune: "Hjartdal",           beskrivelse: "Vakker og avsidesliggende topp i sørvest.",                               bilde: null },
  { id:  9, navn: "Dalsnutfjellet",    hoyde: 1209, lat: 59.48683, lng: 8.83100, kommune: "Hjartdal",           beskrivelse: "Fin utsiktstopp i den sørlige delen av platået.",                         bilde: null },
  { id: 10, navn: "Hellerhovet",       hoyde: 1206, lat: 59.48715, lng: 8.82957, kommune: "Hjartdal",           beskrivelse: "Markert topp nær Dalsnutfjellet med vid utsikt.",                         bilde: null },
  { id: 11, navn: "Skavredalsnut",     hoyde: 1202, lat: 59.56560, lng: 8.80679, kommune: "Hjartdal",           beskrivelse: "Nordlig topp med vid utsikt over Skavredalen.",                           bilde: null },
  { id: 12, navn: "Slettefjell",       hoyde: 1180, lat: 59.54804, lng: 8.88625, kommune: "Hjartdal",           beskrivelse: "Bred, flat topp — gir sjelden oversikt over hele massivet.",              bilde: null },
  { id: 13, navn: "Gyvrenuten",        hoyde: 1176, lat: 59.57147, lng: 8.76351, kommune: "Hjartdal",           beskrivelse: "Topp i nordkanten av platået mot Hjartdal-dalen.",                        bilde: null },
  { id: 14, navn: "Øysteinnatten",     hoyde: 1174, lat: 59.50829, lng: 8.97879, kommune: "Hjartdal / Notodden", beskrivelse: "Kjent landemerke med panoramautsikt. Nås fra Lifjellstua.",             bilde: null },
  { id: 15, navn: "Grimaren",          hoyde: 1169, lat: 59.51304, lng: 8.72860, kommune: "Hjartdal",           beskrivelse: "Vestlig topp nær Mælefjell. Stille og avsidesliggende.",                  bilde: null },
  { id: 16, navn: "Goddalsnuten",      hoyde: 1158, lat: 59.49878, lng: 8.85436, kommune: "Hjartdal",           beskrivelse: "Sentral topp på platået med fin rundutsikt.",                             bilde: null },
  { id: 17, navn: "Gleksefjell",       hoyde: 1121, lat: 59.49164, lng: 8.98169, kommune: "Hjartdal / Seljord", beskrivelse: "Topp i sørøstlig del av platået mot Seljord-dalen.",                    bilde: null },
  { id: 18, navn: "Elslinuten",        hoyde: 1107, lat: 59.52698, lng: 8.76806, kommune: "Hjartdal",           beskrivelse: "Rolig topp vest på platået nær Elslivatn.",                               bilde: null },
  { id: 19, navn: "Sigurdbunuten",     hoyde: 1079, lat: 59.54105, lng: 8.84996, kommune: "Hjartdal",           beskrivelse: "Markert nuten i midtre del av Lifjell.",                                  bilde: null },
  { id: 20, navn: "Himingen",          hoyde: 1066, lat: 59.56418, lng: 8.94021, kommune: "Notodden",           beskrivelse: "Fin topp i nordøst nær DNT-hytta Himingsjå.",                             bilde: null },
  { id: 21, navn: "Gnagelinuten",      hoyde: 1052, lat: 59.50484, lng: 8.83408, kommune: "Hjartdal",           beskrivelse: "Lite besøkt men vakker topp i sørlig del av massivet.",                   bilde: null },
  { id: 22, navn: "Økteren",           hoyde: 1040, lat: 59.52144, lng: 8.94221, kommune: "Hjartdal / Notodden", beskrivelse: "Fin utsiktstopp mot øst. Kort tur fra Lifjellstua-området.",           bilde: null },
  { id: 23, navn: "Ormetjønnuten",     hoyde:  974, lat: 59.51759, lng: 8.87835, kommune: "Hjartdal",           beskrivelse: "Rolig topp ved Ormetjønn. Flott turterreng.",                             bilde: null },
  { id: 24, navn: "Sunnstulnuten",     hoyde:  963, lat: 59.51999, lng: 8.86411, kommune: "Hjartdal",           beskrivelse: "Topp nær Sunnstulvatnet. Godt utgangspunkt for videre ferdsel.",         bilde: null },
  { id: 25, navn: "Rognlifjellet",     hoyde:  940, lat: 59.54153, lng: 8.95648, kommune: "Hjartdal / Notodden", beskrivelse: "Østlig topp på platået, fin dagstur fra Notodden-siden.",              bilde: null },
  { id: 26, navn: "Krintofjell",       hoyde:  930, lat: 59.48330, lng: 8.99889, kommune: "Notodden / Hjartdal", beskrivelse: "Kjent topp nær E134-siden med utsikt over dalen mot nord.",            bilde: null },
  { id: 27, navn: "Bøkstulnatten",     hoyde:  930, lat: 59.48398, lng: 9.00584, kommune: "Seljord",            beskrivelse: "Topp i sørøstkanten av Lifjell mot Seljord.",                            bilde: null },
  { id: 28, navn: "Anebunatten",       hoyde:  878, lat: 59.48077, lng: 8.98342, kommune: "Seljord / Hjartdal", beskrivelse: "Solid topp i østre del. Populær for dagstur fra Anebymarka.",           bilde: null },
  { id: 29, navn: "Bjørgefjell",        hoyde:  875, lat: 59.49004, lng: 8.67916, kommune: "Hjartdal",           beskrivelse: "Vestlig randfjellet på Lifjell. Lite besøkt og stille.",                  bilde: null },
  { id: 30, navn: "Bryggefjell",       hoyde:  786, lat: 59.43941, lng: 8.96939, kommune: "Seljord",            beskrivelse: "Topp i sørkanten av Lifjell-området.",                                    bilde: null },
  { id: 31, navn: "Blåfjell",          hoyde:  731, lat: 59.53445, lng: 9.02214, kommune: "Notodden",           beskrivelse: "Lavere topp i nordøst med utsikt mot Notodden.",                          bilde: null },
  // Topper uten registrert høyde
  { id: 32, navn: "Falkefjell",        hoyde: null, lat: 59.47977, lng: 8.95995, kommune: "Seljord / Hjartdal", beskrivelse: "Navngitt fjell — høyde ikke registrert.",                                bilde: null },
  { id: 33, navn: "Høgefjell",         hoyde: null, lat: 59.46973, lng: 9.01764, kommune: "Seljord",            beskrivelse: "Navngitt fjell — høyde ikke registrert.",                                 bilde: null },
  { id: 34, navn: "Høgeli",            hoyde: null, lat: 59.56594, lng: 9.07458, kommune: "Notodden",           beskrivelse: "Navngitt punkt — høyde ikke registrert.",                                 bilde: null }

  // ===== LEGG TIL EGNE TOPPER HER =====
  // Kopier en av linjene over og endre verdiene.
  // Eksempel:
  // { id: 34, navn: "Nytopp", hoyde: 1050, lat: 59.520, lng: 8.900, kommune: "Hjartdal", beskrivelse: "Din beskrivelse.", bilde: null },
];

// Poeng basert på høyde
FJELL_DATA.forEach(f => {
  f.poeng = f.hoyde ? Math.round(f.hoyde / 10) : 20;
});

// "Her er vi" — Jønnbu
const STEDER_DATA = [
  {
    id: 1,
    navn: "Jønnbu",
    lat: 59.47638,
    lng: 9.01032,
    type: "herErVi",
    beskrivelse: "Utgangspunkt for turer på Lifjell. Parkering og fasiliteter tilgjengelig."
  }
];

const VANN_DATA = [
  // Koordinater fra OpenStreetMap Overpass API + egne
  { id:  1, navn: "Himingtjønna",        lat: 59.5120, lng: 8.9480, kommune: "Hjartdal",           beskrivelse: "Vakker fjellsjø høyt på platået. DNT-hytta Himingsjå ligger nær vannet.", poeng: 45 },
  { id:  2, navn: "Vestre Movatn",       lat: 59.4970, lng: 8.8650, kommune: "Hjartdal",           beskrivelse: "Stille fjellvann omgitt av myr og vidde. Kjent for godt ørretfiske.",     poeng: 40 },
  { id:  3, navn: "Store Movatn",        lat: 59.5010, lng: 8.8780, kommune: "Hjartdal",           beskrivelse: "Fin badeflekk på en varm sommerdag.",                                     poeng: 40 },
  { id:  4, navn: "Sunnstulvatnet",      lat: 59.5270, lng: 8.8920, kommune: "Hjartdal / Notodden", beskrivelse: "Frodig fjellvann i nordvest. Stimer av ørret.",                         poeng: 38 },
  { id:  5, navn: "Gavlesjå",            lat: 59.4950, lng: 8.9200, kommune: "Hjartdal",           beskrivelse: "Godt utgangspunkt for turer mot Jøronnatten.",                            poeng: 35 },
  { id:  6, navn: "Tjønnstultjønn",      lat: 59.5170, lng: 8.9350, kommune: "Hjartdal",           beskrivelse: "Kjent for godt fiske og ensom fjellstemning.",                            poeng: 42 },
  { id:  7, navn: "Store Tjorbuvatn",    lat: 59.5086, lng: 8.7792, kommune: "Hjartdal",           beskrivelse: "Stort fjellvann vest på platået. Flott badespot.",                        poeng: 42 },
  { id:  8, navn: "Vesle Tjorbuvatn",    lat: 59.5053, lng: 8.7660, kommune: "Hjartdal",           beskrivelse: "Lillebror til Store Tjorbuvatn. Rolig og avsides.",                       poeng: 38 },
  { id:  9, navn: "Årstaultjønni",       lat: 59.5163, lng: 8.7641, kommune: "Hjartdal",           beskrivelse: "Liten fjellstjønn vest på Lifjell.",                                      poeng: 35 },
  { id: 10, navn: "Bjørntjørn",          lat: 59.4836, lng: 8.7163, kommune: "Hjartdal",           beskrivelse: "Avsides tjønn i vestlig utmark.",                                         poeng: 35 },
  { id: 11, navn: "Blåtjønn (sør)",      lat: 59.4358, lng: 8.9472, kommune: "Seljord",            beskrivelse: "Blå og klar fjellsjø i sørkanten.",                                       poeng: 32 },
  { id: 12, navn: "Blåtjønn (midt)",     lat: 59.5168, lng: 9.0547, kommune: "Hjartdal",           beskrivelse: "Blå fjellstjønn i østlig del av platået.",                                poeng: 35 },
  { id: 13, navn: "Blåtjønn (nord)",     lat: 59.5682, lng: 8.7802, kommune: "Hjartdal",           beskrivelse: "Nordlig Blåtjønn nær Blåtjønnfjell.",                                    poeng: 40 },
  { id: 14, navn: "Blomtjønn",           lat: 59.5015, lng: 8.8071, kommune: "Hjartdal",           beskrivelse: "Vakker tjønn omgitt av blomstereng om sommeren.",                         poeng: 35 },
  { id: 15, navn: "Breiøkstjønnan",      lat: 59.4829, lng: 8.7885, kommune: "Hjartdal",           beskrivelse: "Bredt og stille fjellvann.",                                              poeng: 35 },
  { id: 16, navn: "Dyrdalstjønn",        lat: 59.5111, lng: 8.9644, kommune: "Hjartdal",           beskrivelse: "Tjønn i Dyrdalen. Godt ørretfiske.",                                     poeng: 37 },
  { id: 17, navn: "Fisbutjønn",          lat: 59.4658, lng: 8.7419, kommune: "Hjartdal",           beskrivelse: "Fiskerik tjønn i vestlig utmark.",                                        poeng: 35 },
  { id: 18, navn: "Flisetjønn (vest)",   lat: 59.5756, lng: 8.7851, kommune: "Hjartdal",           beskrivelse: "Vestlig Flisetjønn nær platåkanten.",                                     poeng: 38 },
  { id: 19, navn: "Flisetjønn (nord)",   lat: 59.5839, lng: 8.8433, kommune: "Hjartdal",           beskrivelse: "Nordlig Flisetjønn i utkanten av platået.",                               poeng: 36 },
  { id: 20, navn: "Gråntjønn",           lat: 59.5024, lng: 8.7456, kommune: "Hjartdal",           beskrivelse: "Tjønn med grønnlig farge i vestlig utmark.",                              poeng: 35 },
  { id: 21, navn: "Holmen",              lat: 59.4957, lng: 8.9182, kommune: "Hjartdal",           beskrivelse: "Vann med liten holme. Idyllisk badested.",                                poeng: 38 },
  { id: 22, navn: "Hurumskardtjønna",    lat: 59.4936, lng: 8.8699, kommune: "Hjartdal",           beskrivelse: "Tjønn i Hurumskardet. Fin tur fra Jøronnatten.",                          poeng: 40 },
  { id: 23, navn: "Hytteskardtjørnan",   lat: 59.5230, lng: 8.7865, kommune: "Hjartdal",           beskrivelse: "Tjønn i Hytteskardet nær Røysdalsnuten.",                                 poeng: 40 },
  { id: 24, navn: "Igletveittjønni",     lat: 59.4629, lng: 8.7262, kommune: "Hjartdal",           beskrivelse: "Avsides tjønn i vestlig utmark.",                                         poeng: 33 },
  { id: 25, navn: "Illfisktjønn",        lat: 59.5411, lng: 8.8715, kommune: "Hjartdal",           beskrivelse: "Kjent for ekstra god ørret — derav navnet.",                              poeng: 42 },
  { id: 26, navn: "Kloppsteintjønni",    lat: 59.4477, lng: 8.8073, kommune: "Hjartdal",           beskrivelse: "Tjønn ved Kloppstein i sørvest.",                                         poeng: 33 },
  { id: 28, navn: "Kroktjønn",           lat: 59.5118, lng: 9.0583, kommune: "Hjartdal",           beskrivelse: "Krokete tjønn i nordre del av platået. God fiskebestand.",               poeng: 35 },
  { id: 29, navn: "Kupatjønn",           lat: 59.4354, lng: 8.8804, kommune: "Seljord",            beskrivelse: "Tjønn i sørkanten av Lifjell-området.",                                   poeng: 30 },
  { id: 30, navn: "Kvålsgardtjønni",     lat: 59.4333, lng: 8.6494, kommune: "Hjartdal",           beskrivelse: "Tjønn i sørvestlig utmark nær Kvålsgard.",                                poeng: 30 },
  { id: 31, navn: "Ljosevatn",           lat: 59.4427, lng: 8.6623, kommune: "Hjartdal",           beskrivelse: "Lyst og klart fjellvann i sørvest.",                                      poeng: 33 },
  { id: 32, navn: "Ljoslihovet",         lat: 59.5294, lng: 8.9170, kommune: "Hjartdal",           beskrivelse: "Fin tjønn sentralt på platået.",                                          poeng: 38 },
  { id: 33, navn: "Mjeltetjønn",         lat: 59.5041, lng: 8.9316, kommune: "Hjartdal",           beskrivelse: "Stille tjønn i sentralt terreng.",                                        poeng: 37 },
  { id: 34, navn: "Mørketjønn",          lat: 59.5063, lng: 8.7880, kommune: "Hjartdal",           beskrivelse: "Mørk og dyp fjellsjø. Spøkelsesaktig stemning.",                          poeng: 40 },
  { id: 35, navn: "Pråmtjønn",           lat: 59.5527, lng: 8.9424, kommune: "Hjartdal / Notodden", beskrivelse: "Tjønn nord på platået. Rolig og avsides.",                              poeng: 38 },
  { id: 36, navn: "Repetjønn",           lat: 59.4837, lng: 8.9134, kommune: "Hjartdal",           beskrivelse: "Klar fjellstjønn sentralt på Lifjell.",                                  poeng: 37 },
  { id: 37, navn: "Rjupetjønn",          lat: 59.4952, lng: 8.9344, kommune: "Hjartdal",           beskrivelse: "Rypesjø på platået. Mange rypespor om vinteren.",                         poeng: 38 },
  { id: 38, navn: "Romnestjønni",        lat: 59.4363, lng: 8.8220, kommune: "Seljord / Hjartdal", beskrivelse: "Tjønn i sørkanten av platået.",                                           poeng: 30 },
  { id: 39, navn: "Sandtjønn",           lat: 59.4974, lng: 8.9651, kommune: "Hjartdal",           beskrivelse: "Tjønn med sandbunn. God badetemperatur om sommeren.",                     poeng: 38 },
  { id: 40, navn: "Sautjønn (aust)",     lat: 59.4959, lng: 8.9879, kommune: "Hjartdal",           beskrivelse: "Østlig Sautjønn. Populær rasteplass.",                                    poeng: 35 },
  { id: 41, navn: "Sautjønn (vest)",     lat: 59.4983, lng: 8.9327, kommune: "Hjartdal",           beskrivelse: "Vestlig Sautjønn på platået.",                                            poeng: 35 },
  { id: 42, navn: "Skardtjønn",          lat: 59.5050, lng: 8.9428, kommune: "Hjartdal",           beskrivelse: "Tjønn i et skard mellom to topper.",                                      poeng: 40 },
  { id: 43, navn: "Skarstjønn",          lat: 59.4743, lng: 8.8337, kommune: "Hjartdal",           beskrivelse: "Avsides tjønn i skarterreng.",                                            poeng: 38 },
  { id: 44, navn: "Skarstjønnan",        lat: 59.4767, lng: 8.7966, kommune: "Hjartdal",           beskrivelse: "Gruppe av skartjønner vest på platået.",                                  poeng: 38 },
  { id: 45, navn: "Skautjønn",           lat: 59.5719, lng: 8.7714, kommune: "Hjartdal",           beskrivelse: "Tjønn på nordlig skau. Stillfull og vakker.",                             poeng: 38 },
  { id: 46, navn: "Skråttjønn",          lat: 59.5150, lng: 8.8466, kommune: "Hjartdal",           beskrivelse: "Tjønn i skrånende terreng midt på platået.",                              poeng: 37 },
  { id: 47, navn: "Sleivtjønn",          lat: 59.4929, lng: 8.9811, kommune: "Hjartdal",           beskrivelse: "Tjønn med karakteristisk form øst på platået.",                           poeng: 37 },
  { id: 48, navn: "Snotjønn",            lat: 59.4984, lng: 8.9820, kommune: "Hjartdal",           beskrivelse: "Tjønn som holder snø lenge om våren.",                                    poeng: 37 },
  { id: 49, navn: "Storsteintjønna",     lat: 59.5029, lng: 8.9724, kommune: "Hjartdal",           beskrivelse: "Tjønn ved store steinblokker. Bra fiske.",                                poeng: 38 },
  { id: 50, navn: "Svarttjønn (1)",      lat: 59.5010, lng: 8.9039, kommune: "Hjartdal",           beskrivelse: "Mørk og dyp tjønn sentralt på platået.",                                  poeng: 38 },
  { id: 51, navn: "Svarttjønn (2)",      lat: 59.5139, lng: 9.0822, kommune: "Hjartdal",           beskrivelse: "Østlig Svarttjønn nær Notodden-kanten.",                                  poeng: 35 },
  { id: 52, navn: "Svarttjønn (3)",      lat: 59.5545, lng: 9.0593, kommune: "Hjartdal / Notodden", beskrivelse: "Nordøstlig Svarttjønn.",                                                poeng: 35 },
  { id: 53, navn: "Svarttjønn (4)",      lat: 59.5581, lng: 9.0293, kommune: "Hjartdal / Notodden", beskrivelse: "Nordlig Svarttjønn nær platåkanten.",                                   poeng: 35 },
  { id: 54, navn: "Tjønnstaultjønni",    lat: 59.4576, lng: 8.8378, kommune: "Hjartdal",           beskrivelse: "Tjønn ved Tjønnstaul. Populær rasteplass.",                               poeng: 35 },
  { id: 55, navn: "Tjørnfly",            lat: 59.4987, lng: 8.6720, kommune: "Hjartdal",           beskrivelse: "Flatt fjellvann i vestlig utmark.",                                       poeng: 35 },
  { id: 56, navn: "Tritjønnan",          lat: 59.4876, lng: 8.8409, kommune: "Hjartdal",           beskrivelse: "Tre tjønner i rekke — derav navnet.",                                     poeng: 40 },
  { id: 57, navn: "Trolltjønn",          lat: 59.5203, lng: 9.0656, kommune: "Hjartdal / Notodden", beskrivelse: "Mystisk tjønn med sagn knyttet til seg.",                               poeng: 40 },
  { id: 58, navn: "Trytetjønn",          lat: 59.4519, lng: 9.0877, kommune: "Seljord",            beskrivelse: "Tjønn i sørkanten mot Seljord.",                                          poeng: 30 },
  { id: 59, navn: "Tvottjønn",           lat: 59.5174, lng: 9.0734, kommune: "Hjartdal / Notodden", beskrivelse: "Tjønn der folk tradisjonelt vasket klær.",                              poeng: 35 },
  { id: 60, navn: "Uddetjønn",           lat: 59.4605, lng: 8.7853, kommune: "Hjartdal",           beskrivelse: "Tjønn med fin odde og badeplass.",                                        poeng: 35 },
  { id: 61, navn: "Vefalltjønni",        lat: 59.4403, lng: 8.8222, kommune: "Hjartdal / Seljord", beskrivelse: "Tjønn i sørkanten ved Vefallbekken.",                                     poeng: 30 },
  { id: 62, navn: "Viertjønn",           lat: 59.5113, lng: 8.8620, kommune: "Hjartdal",           beskrivelse: "Stille tjønn sentralt på platået. God ørretbestand.",                    poeng: 38 },
  { id: 63, navn: "Gvolvbekktjønna",     lat: 59.5169, lng: 9.0474, kommune: "Hjartdal",           beskrivelse: "Tjønn langs Gvolvbekken i østlig del.",                                   poeng: 35 },
  { id: 64, navn: "Hanakamtjønna",       lat: 59.4351, lng: 8.9288, kommune: "Seljord",            beskrivelse: "Tjønn ved Hanakampen i sørkanten.",                                       poeng: 30 },
  { id: 65, navn: "Damtjønn",            lat: 59.5778, lng: 8.7374, kommune: "Hjartdal",           beskrivelse: "Tjønn ved en gammel dam i nordvest.",                                     poeng: 35 },
  { id: 66, navn: "Fuggedammen",         lat: 59.4447, lng: 9.0676, kommune: "Seljord",            beskrivelse: "Dam i sørkanten av Lifjell-området.",                                     poeng: 28 },
  { id: 67, navn: "Steintjønn",          lat: 59.4473, lng: 9.0718, kommune: "Seljord",            beskrivelse: "Tjønn omgitt av stein og bergvegger.",                                    poeng: 32 },

  { id: 68, navn: "Skriutjønn",          lat: 59.5834, lng: 9.0255, kommune: "Hjartdal / Notodden", beskrivelse: "Tjønn i nordøstkanten av platået.",                                     poeng: 35 },
  { id: 69, navn: "Barlindholttjønn",   lat: 59.5621, lng: 9.0577, kommune: "Notodden",           beskrivelse: "Tjønn ved Barlindholtet i nordøst.",                                      poeng: 35 },
  { id: 70, navn: "Elgstjønn",          lat: 59.5709, lng: 9.0969, kommune: "Notodden",           beskrivelse: "Tjønn i nordøstlig del av Lifjell-området. Kjent elgterreng.",             poeng: 35 },

  // ===== LEGG TIL EGNE VANN HER =====
  // { id: 71, navn: "Nyvatn", lat: 59.510, lng: 8.920, kommune: "Hjartdal", beskrivelse: "Din beskrivelse.", poeng: 35 },
];
