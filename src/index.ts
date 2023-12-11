import * as fs from "fs";
import { v4 as uuid } from "uuid";
import { parse } from "csv-parse";

var generatedReference = uuid();
var index: number = 0;
const keys: any[] = [];
const results: any[] = [];

const log = (text: string): void => {
  console.log(`[${new Date().toLocaleString()}] ${text}`);
};

const generateOutput = () => {
  results.map((v: string) => {
    console.log(v);
  });
};

const start = () => {
  log(`Running with reference: ${generatedReference}`);
  fs.readdirSync("./src/input").map((file: any) => {
    if (file) {
      log(`Found input file: ${file}`);
      fs.createReadStream("./src/input/" + file)
        .pipe(
          parse({
            delimiter: ";",
            relax_quotes: true,
            escape: "\\",
            ltrim: true,
            rtrim: true,
          })
        )
        .on("data", (r: string[]) => {
          if (index === 0) {
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
          generateOutput();
        });
    }
  });
};

start();
