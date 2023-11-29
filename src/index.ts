import * as fs from "fs";
import { v4 as uuid } from "uuid";
import { parse } from "csv-parse";

var generatedReference = uuid();
var index: number = 0;
const keys: any[] = [];
const values: any[] = [];
var results: any[] = [];

const log = (text: string): void => {
  console.log(`[${new Date().toLocaleString()}] ${text}`);
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
          })
        )
        .on("data", (r: string[]) => {
          if (index === 0) {
            keys.push(r);
          } else {
            results.push(Object.assign({}, r));
          }
          index++;
        })
        .on("end", () => {
          console.log(results);
        });
    }
  });
};

start();
