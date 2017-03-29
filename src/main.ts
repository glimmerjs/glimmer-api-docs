import Application from '@glimmer/application';
import Resolver, { ResolverConfiguration, BasicModuleRegistry } from '@glimmer/resolver';
import config from './config/environment';
import moduleMap from './config/module-map';

const resolverConfiguration: ResolverConfiguration = {
  app: { name: config.modulePrefix, rootName: config.modulePrefix },
  types: config.moduleConfiguration.types,
  collections: config.moduleConfiguration.collections
};

export default class App extends Application {
  constructor() {
    let moduleRegistry = new BasicModuleRegistry(moduleMap);
    let resolver = new Resolver(resolverConfiguration, moduleRegistry);

    super({
      rootName: config.modulePrefix,
      resolver
    });
  }
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/api/service.js')
    .then(registration => {
      // Registration was successful
      console.log('ServiceWorker registration successful with scope: ', registration.scope);
    }).catch(function(err) {
      // registration failed :(
      console.log('ServiceWorker registration failed: ', err);
    });
  });
}
