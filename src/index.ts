import * as fs from "fs";
import { v4 as uuid } from "uuid";
import { parse } from "csv-parse";
import { create } from "xmlbuilder2";

var generatedReference = "";
var index: number = 0;
var keys: any[] = [];
var results: any[] = [];

const log = (text: string): void => {
  console.log(`[${new Date().toLocaleString()}] ${text}`);
};

const start = () => {
  const input = fs.readdirSync("./src/input");
  if (input.length > 0) {
    input.map((file: any) => {
      generatedReference = uuid();
      keys = [];
      results = [];
      if (file) {
        log(`Running with reference: ${generatedReference}`);
        log(`Found input file: ${file}`);
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
          .on("data", (r: string[]) => {
            if (index === 0) {
              // Keys at first row
              r.map((v: string) => keys.push(v));
            } else {
              var temp: any = {};
              r.map((v: string, i: any) => {
                temp = { ...temp, [keys[i]]: v };
              });
              results.push(temp);
            }
            index++;
          })
          .on("end", () => {
            generateOutput(
              file,
              results.filter(
                (obj, index) =>
                  results.findIndex(
                    (item) =>
                      item.Lieferschein === obj.Lieferschein &&
                      item.Inhalt === obj.Inhalt
                  ) === index
              )
            );
          });
      }
    });
  } else {
    log(`No input file found!`);
  }
};

const generateOutput = (file: string, input: any[]) => {
  var cargos: any[] = [];
  input.map((i: any) => {
    if (
      cargos.find((c: any) => c.Lieferschein === i.Lieferschein) === undefined
    ) {
      cargos.push({
        Lieferschein: i.Lieferschein,
        goods: [
          {
            Paletten: parseInt(i.Paletten === "0" ? "1" : i.Paletten),
            loadingmeter: parseInt(i.Paletten) * 0.6,
            Inhalt: i.Inhalt,
            Gewicht: parseInt(i.Gewicht),
            Lieferhinweis: i.Lieferhinweis,
            VP: i.VP,
            Packzettelnummer: i.Packzettelnummer,
          },
        ],
      });
    } else {
      cargos.map((c: any) => {
        if (c.Lieferschein === i.Lieferschein) {
          c.goods.push({
            Paletten: parseInt(i.Paletten === "0" ? "1" : i.Paletten),
            loadingmeter: parseInt(i.Paletten) * 0.6,
            Inhalt: i.Inhalt,
            Gewicht: parseInt(i.Gewicht),
            Lieferhinweis: i.Lieferhinweis,
            VP: i.VP,
            Packzettelnummer: i.Packzettelnummer,
          });
        }
      });
    }
  });
  createXML(
    file,
    input.filter(
      (obj, index) =>
        input.findIndex((item) => item.Lieferschein === obj.Lieferschein) ===
        index
    ),
    cargos
  );
};

const createXML = (file: string, input: any[], cargos: any[]) => {
  var filename = "generated_" + new Date().getTime() + ".xml";
  fs.writeFileSync(
    "./src/output/" + filename,
    create({
      import: {
        ediprovider_id: {
          "@matchmode": 0,
          "#text": 3,
        },
        company_id: {
          "@matchmode": 0,
          "#text": 1,
        },
        transportbookings: {
          transportbooking: {
            edireference: {
              "#text": generatedReference,
            },
            reference: {
              "#text": generatedReference,
            },
            customer_id: {
              "@matchmode": 8,
              "#text": 1555, // GSH
            },
            shipments: input.map((i: any) => ({
              shipment: {
                edireference: {
                  "#text": generatedReference,
                },
                reference: {
                  "#text": i.Lieferschein,
                },
                plangroup_id: {
                  "@matchmode": 0,
                  "#text": 1,
                },
                planningnote: {
                  "#text":
                    i.Lieferhinweis != ""
                      ? i.Lieferhinweis.replace(/  +/g, " ") +
                        " Bestelnummer: " +
                        i.Bestellnummer
                      : null,
                },
                pickupaddress: {
                  address_id: {
                    "@matchmode": 0,
                    "#text": 1495,
                  },
                  reference: {
                    "#text": i.Lieferschein,
                  },
                  date: {
                    "#text":
                      i.Abholtermin != ""
                        ? i.Abholtermin.split(".")[2] +
                          "-" +
                          i.Abholtermin.split(".")[1] +
                          "-" +
                          i.Abholtermin.split(".")[0]
                        : null,
                  },
                },
                deliveryaddress: {
                  address_id: {
                    "@matchmode": 5,
                    "#text": i.Empfaenger,
                  },
                  date: {
                    "#text":
                      i.Liefertermin != ""
                        ? i.Liefertermin.split(".")[2] +
                          "-" +
                          i.Liefertermin.split(".")[1] +
                          "-" +
                          i.Liefertermin.split(".")[0]
                        : null,
                  },
                  time: {
                    "#text":
                      i.LieferzeitVon != ""
                        ? i.LieferzeitVon.slice(0, 2) +
                          ":" +
                          i.LieferzeitVon.slice(2, 4)
                        : null,
                  },
                  timetill: {
                    "#text":
                      i.LieferzeitBis != ""
                        ? i.LieferzeitBis.slice(0, 2) +
                          ":" +
                          i.LieferzeitBis.slice(2, 4)
                        : null,
                  },
                  name: {
                    "#text": i.Empfaenger,
                  },
                  address1: {
                    "#text": i.Empfaenger_Strasse,
                  },
                  zipcode: {
                    "#text": i.Empfaenger_PLZ,
                  },
                  country_id: {
                    "@matchmode": 0,
                    "#text": 17,
                  },
                  city_id: {
                    "@matchmode": 4,
                    "#text": i.Empfaenger_Ort,
                  },
                  driverinfo: {
                    "#text": i.Bemerkung + " - " + i.Telefon,
                  },
                  remarks: {
                    "#text":
                      i.Lieferhinweis != ""
                        ? i.Lieferhinweis.replace(/  +/g, " ") +
                          " Bestelnummer: " +
                          i.Bestellnummer
                        : null,
                  },
                  phone: {
                    "#text": i.Telefon,
                  },
                  email: {
                    "#text": i.EMail || null,
                  },
                },
                cargo: cargos.map((c: any) =>
                  c.Lieferschein === i.Lieferschein
                    ? {
                        unit_id: {
                          "@matchmode": 3,
                          "#text": "COL",
                        },
                        unitamount: {
                          "#text": c.goods.reduce(
                            (acc: any, cur: any) => (acc += cur.Paletten),
                            0
                          ),
                        },
                        loadingmeter: {
                          "#text": (
                            c.goods.reduce(
                              (acc: any, cur: any) => (acc += cur.Paletten),
                              0
                            ) * 0.6
                          ).toFixed(1),
                        },
                        weight: {
                          "#text": c.goods.reduce(
                            (acc: any, cur: any) => (acc += cur.Gewicht),
                            0
                          ),
                        },
                        bool1: {
                          "#text": i.Entladehilfe === "1" ? true : false, // Kooiaap
                        },
                        bool2: {
                          "#text": false,
                        },
                        bool3: {
                          "#text": i.VP === "FP", // Pallet change
                        },
                        goodslines: {
                          goodsline: c.goods.map((g: any) => ({
                            unitamount: {
                              "#text": g.Paletten,
                            },
                            weight: {
                              "#text": g.Gewicht,
                            },
                            unit_id: {
                              "@matchmode": 3,
                              "#text":
                                g.VP === "FP" ? "Euro" : "Eenmalige pallet",
                            },
                            loadingmeter: {
                              "#text": g.loadingmeter,
                            },
                            productdescription: {
                              "#text": g.Inhalt,
                            },
                            barcode: {
                              "#text": g.Packzettelnummer,
                            },
                          })),
                        },
                      }
                    : null
                ),
              },
            })),
          },
        },
      },
    }).end({ prettyPrint: true })
  );
  log(`Successfully created XML file: ${filename}`);
  fs.unlinkSync("./src/input/" + file);
};

start();
