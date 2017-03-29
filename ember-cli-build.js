const { GlimmerApp } = require('@glimmer/application-pipeline');
const json = require('broccoli-json-module');
const Funnel = require('broccoli-funnel');
const Rollup = require('broccoli-rollup');
const merge = require('broccoli-merge-trees');
const concat = require('broccoli-concat');
const typescript = require('broccoli-typescript-compiler');

module.exports = function(defaults) {
  var app = new GlimmerApp(defaults, {
    // Add options here
  });

  // Use `app.import` to add additional libraries to the generated
  // output files.
  //
  // If you need to use different assets in different
  // environments, specify an object as the first parameter. That
  // object's keys should be the environment name and the values
  // should be the asset to use in that environment.
  //
  // If the library that you are including contains AMD or ES6
  // modules that you would like to import into your application
  // please specify an object with the list of modules as keys
  // along with the exports of each module as its value.

  var docs = new Rollup(json('docs-source'), {
    rollup: {
      entry: 'main.js',
      format: 'umd',
      dest: 'main.js',
      moduleName: 'docs'
    }
  });

  var extraAssets = new Funnel(docs, {
    srcDir: '/',
    destDir: '/assets/docs'
  });

  let styles = concat('styles', {
    inputFiles: ['**/*.css'],
    outputFile: 'app.css'
  });

  let worker = typescript('workers', {
    tsconfig: {
      compilerOptions: {
        module: 'es6',
        target: 'es6'
      }
    }
  });

  // worker = new Rollup(workers, {
  //   rollup: {
  //     entry: 'service.js',
  //     format: 'es',
  //     dest: 'service.js'
  //   }
  // });

  return merge([app.toTree(), extraAssets, styles, worker]);
  // return app.toTree();
};
