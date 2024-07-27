import { join } from "path";

console.log("Configuring environment...");

const TSConfig = JSON.stringify(
    {
        compilerOptions: {
            rootDirs: [".."],
            paths: {
                "$*": ["../src/*"],
                $env: ["./env.ts"],
            },
            verbatimModuleSyntax: true,
            isolatedModules: true,
            lib: ["esnext"],
            moduleResolution: "bundler",
            module: "esnext",
            noEmit: true,
            target: "esnext",
        },
        include: ["../src/**/*.js", "../src/**/*.ts"],
        exclude: ["../node_modules/**"],
    },
    null,
    4
);

await Bun.write(join(".project", "tsconfig.json"), TSConfig);

const variables = Object.keys(process.env);
const contents = variables.map((variable) => `export const ${variable} = process.env.${variable}!;`).join("\n");
const env = "//@ts-nocheck\n" + contents;

await Bun.write(join(".project", "env.ts"), env);

console.log("Done!");
