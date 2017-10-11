import App from './main';
import { ComponentManager, setPropertyDidChange } from '@glimmer/component';

const app = new App();
const containerElement = document.getElementById('app');

setPropertyDidChange(() => {
  app.scheduleRerender();
});

app.registerInitializer({
  initialize(registry) {
    registry.register(`component-manager:/${app.rootName}/component-managers/main`, ComponentManager);
  }
});

app.boot();

while(containerElement.firstChild) {
  containerElement.removeChild(containerElement.firstChild);
}
app.renderComponent('GlimmerApiDocs', containerElement, null);
