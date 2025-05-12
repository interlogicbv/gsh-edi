// imports
import * as fs from "fs";
import { v4 as uuid } from "uuid";
import { parse } from "csv-parse";
import { create } from "xmlbuilder2";

// Types
type InputRow = {
  Lieferschein: string;
  Inhalt: string;
  Paletten: string;
  Gewicht: string;
  Lieferhinweis: string;
  VP: string;
  Packzettelnummer: string;
  Bestellnummer: string;
  Abholtermin: string;
  Empfaenger: string;
  Empfaenger_Strasse: string;
  Empfaenger_PLZ: string;
  Empfaenger_Ort: string;
  Bemerkung: string;
  Telefon: string;
  EMail?: string;
  Liefertermin: string;
  LieferzeitVon: string;
  LieferzeitBis: string;
  Entladehilfe: string;
};

type GoodsLine = {
  Paletten: number;
  loadingmeter: number;
  Inhalt: string;
  Gewicht: number;
  Lieferhinweis: string;
  VP: string;
  Packzettelnummer: string;
};

type Cargo = {
  Lieferschein: string;
  goods: GoodsLine[];
};

// Utils
const log = (text: string): void => {
  console.log(`[${new Date().toLocaleString()}] ${text}`);
};

// Main
const start = () => {
  const inputFiles = fs.readdirSync("./src/input");
  if (inputFiles.length === 0) {
    log(`No input file found!`);
    return;
  }

  inputFiles.forEach((file) => {
    const reference = uuid();
    log(`Running with reference: ${reference}`);
    log(`Found input file: ${file}`);

    const keys: string[] = [];
    const rows: InputRow[] = [];

    fs.createReadStream("./src/input/" + file)
      .pipe(
        parse({
          delimiter: ";",
          relax_quotes: true,
          escape: "\\",
          ltrim: true,
          rtrim: true,
          bom: true,
        })
      )
      .on("data", (row: string[]) => {
        if (keys.length === 0) {
          row.forEach((v) => keys.push(v));
        } else {
          const obj: any = {};
          row.forEach((v, i) => {
            obj[keys[i]] = v;
          });
          rows.push(obj as InputRow);
        }
      })
      .on("end", () => {
        const uniqueRows = dedupeRows(rows);
        const cargos = groupCargos(uniqueRows);
        createXML(file, reference, uniqueRows, cargos);
      });
  });
};

// Remove duplicates (Lieferschein + Inhalt)
const dedupeRows = (rows: InputRow[]): InputRow[] => {
  return rows.filter(
    (obj, index, self) =>
      self.findIndex(
        (item) =>
          item.Lieferschein === obj.Lieferschein && item.Inhalt === obj.Inhalt
      ) === index
  );
};

// Group goods by Lieferschein
const groupCargos = (rows: InputRow[]): Cargo[] => {
  const cargos: Cargo[] = [];

  rows.forEach((row) => {
    const pallets = parseInt(row.Paletten) === 0 ? 1 : parseInt(row.Paletten);
    const good: GoodsLine = {
      Paletten: pallets,
      loadingmeter: pallets * 0.6,
      Inhalt: row.Inhalt,
      Gewicht: parseInt(row.Gewicht),
      Lieferhinweis: row.Lieferhinweis,
      VP: row.VP,
      Packzettelnummer: row.Packzettelnummer,
    };

    const existingCargo = cargos.find(
      (c) => c.Lieferschein === row.Lieferschein
    );
    if (existingCargo) {
      existingCargo.goods.push(good);
    } else {
      cargos.push({
        Lieferschein: row.Lieferschein,
        goods: [good],
      });
    }
  });

  return cargos;
};

// Create XML
const createXML = (
  file: string,
  reference: string,
  rows: InputRow[],
  cargos: Cargo[]
) => {
  const filename = "generated_" + Date.now() + ".xml";

  const xml = create({
    import: {
      ediprovider_id: { "@matchmode": 0, "#text": 3 },
      company_id: { "@matchmode": 0, "#text": 1 },
      transportbookings: {
        transportbooking: {
          edireference: { "#text": reference },
          reference: { "#text": reference },
          customer_id: { "@matchmode": 8, "#text": 1555 },
          shipments: {
            shipment: cargos.map((cargo) => {
              const row = rows.find(
                (r) => r.Lieferschein === cargo.Lieferschein
              )!;
              const totalPaletten = cargo.goods.reduce(
                (acc, cur) => acc + cur.Paletten,
                0
              );
              const totalGewicht = cargo.goods.reduce(
                (acc, cur) => acc + cur.Gewicht,
                0
              );
              const totalLoadingmeter = (totalPaletten * 0.6).toFixed(1);

              return {
                edireference: { "#text": reference },
                reference: { "#text": cargo.Lieferschein },
                plangroup_id: { "@matchmode": 0, "#text": 1 },
                planningnote: row.Lieferhinweis
                  ? `${row.Lieferhinweis.replace(/  +/g, " ")} Bestelnummer: ${
                      row.Bestellnummer
                    }`
                  : null,
                pickupaddress: {
                  address_id: { "@matchmode": 0, "#text": 1495 },
                  reference: { "#text": cargo.Lieferschein },
                  date: row.Abholtermin ? formatDate(row.Abholtermin) : null,
                },
                deliveryaddress: {
                  address_id: { "@matchmode": 5, "#text": row.Empfaenger },
                  date: row.Liefertermin ? formatDate(row.Liefertermin) : null,
                  time: row.LieferzeitVon
                    ? formatTime(row.LieferzeitVon)
                    : null,
                  timetill: row.LieferzeitBis
                    ? formatTime(row.LieferzeitBis)
                    : null,
                  name: { "#text": row.Empfaenger },
                  address1: { "#text": row.Empfaenger_Strasse },
                  zipcode: { "#text": row.Empfaenger_PLZ },
                  country_id: { "@matchmode": 0, "#text": 17 },
                  city_id: { "@matchmode": 4, "#text": row.Empfaenger_Ort },
                  driverinfo: `${row.Bemerkung} - ${row.Telefon}`,
                  remarks: row.Lieferhinweis
                    ? `${row.Lieferhinweis.replace(
                        /  +/g,
                        " "
                      )} Bestelnummer: ${row.Bestellnummer}`
                    : null,
                  phone: row.Telefon,
                  email: row.EMail || null,
                },
                cargo: {
                  unit_id: { "@matchmode": 3, "#text": "COL" },
                  unitamount: totalPaletten,
                  loadingmeter: totalLoadingmeter,
                  weight: totalGewicht,
                  bool1: row.Entladehilfe === "1",
                  bool2: false,
                  bool3: cargo.goods.some((g) => g.VP === "FP"), // any FP
                  goodslines: {
                    goodsline: cargo.goods.map((g) => ({
                      unitamount: g.Paletten,
                      weight: g.Gewicht,
                      unit_id: {
                        "@matchmode": 3,
                        "#text": g.VP === "FP" ? "Euro" : "Eenmalige pallet",
                      },
                      loadingmeter: g.loadingmeter,
                      productdescription: g.Inhalt,
                      barcode: g.Packzettelnummer,
                    })),
                  },
                },
              };
            }),
          },
        },
      },
    },
  }).end({ prettyPrint: true });

  fs.writeFileSync(`./src/output/${filename}`, xml);
  log(`Successfully created XML file: ${filename}`);
  //fs.unlinkSync(`./src/input/${file}`);
};

// Helpers
const formatDate = (dateStr: string): string | null => {
  const parts = dateStr.split(".");
  if (parts.length !== 3) return null;
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
};

const formatTime = (timeStr: string): string | null => {
  if (timeStr.length !== 4) return null;
  return `${timeStr.slice(0, 2)}:${timeStr.slice(2, 4)}`;
};

// Run it
start();
