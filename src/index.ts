import * as fs from "fs";
import { v4 as uuid } from "uuid";
import { parse } from "csv-parse";
import { create } from "xmlbuilder2";

var generatedReference = uuid();
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
            console.log(results);
          });
      }
    });
  } else {
    log(`No input file found!`);
  }
};

start();
