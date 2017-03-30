import Component, { tracked } from "@glimmer/component";
import { default as DocsService, EntityObject } from './../../../utils/data';
import {
  getIdsFromPath,
  MODULE_PATH_LABEL,
  PROJECT_PATH_LABEL
} from './../../../utils/routing';


// TODO: get this from config
const basePath = '/api/';
const strippedRootUrl = basePath.split('/').filter((str) => !!str).join('/');
const rootUrl = !!strippedRootUrl ? '/' + strippedRootUrl + '/' : '/';

function removeBasePath(base: string, url: string) {
  if (base[0] === '/'){
    base = base.substring(1);
  }
  if (url[0] === '/'){
    url = url.substring(1);
  }
  if (base === url.substring(0, base.length)) {
    url = url.substring(base.length);
  }
  if (url[0] !== '/'){
    url = '/' + url;
  }
  return url;
}

interface CurrentView {
  title: string;
  componentName: string | null;
  project: EntityObject;
  module: EntityObject;
  notFound?: boolean,
}

interface CurrentState {
  title: string;
  componentName: string | null;
  project: string;
  module: string;
  notFound?: boolean,
}

export default class GlimmerApiDocs extends Component {
  @tracked theCurrentView: CurrentView = {
    title: '',
    componentName: null,
    project: null,
    module: null,
    notFound: false
  };

  /**
   * Service object to fetch docs data.
   */
  docsService = new DocsService();

  loadFromUrl(url: string) {
    const path = removeBasePath(strippedRootUrl, url);
    const { moduleId, projectId } = getIdsFromPath(path);
    let stateObj;
    if (path === '/' || !path) {
      stateObj = this.showIndex();
    } else if (!projectId) {
      stateObj = this.show404();
    } else if(moduleId) {
      stateObj = this.showModule(projectId, moduleId);
    } else {
      stateObj = this.showProject(projectId);
    }
    this.hideNav();

    document.title = stateObj.title;
    window.history.pushState(stateObj, stateObj.title, `/${strippedRootUrl}${path}`);
  }

  bindInternalLinks() {
    document.addEventListener('click', (evt: Event) => {
      const target = <HTMLElement>evt.target;
      if (target.tagName === 'A' && target.classList.contains('internal-link')) {
        evt.preventDefault();
        this.loadFromUrl(target.getAttribute('href'));
      }
    });
  }

  showNav() {
    const menu = document.getElementById('menu-container');
    const hamburger = document.getElementById('menu-toggle');
    menu.classList.add('is-active');
    hamburger.classList.add('is-active');
  }

  hideNav() {
    const menu = document.getElementById('menu-container');
    const hamburger = document.getElementById('menu-toggle');
    menu.classList.remove('is-active');
    hamburger.classList.remove('is-active');
  }

  toggleNav() {
    const hamburger = document.getElementById('menu-toggle');
    if (hamburger.classList.contains('is-active')) {
      this.hideNav();
    } else {
      this.showNav();
    }
  }

  setupRouting() {
    window.onpopstate = (evt) => {
      if (evt.state) {
        const view = this.deserializeState(evt.state);
        this.theCurrentView = view;
      }
    }
    this.bindInternalLinks();
    this.loadFromUrl(window.location.pathname);
  }

  didInsertElement() {
    this.setupRouting();
  }

  /**
   * This property holds the whole documentation tree.
   */
  get model() {
      return this.docsService.fetchRoot();
  }

  show404() {
    this.theCurrentView = {
      title: `${this.model.main.title} - 404`,
      module: null,
      project: null,
      componentName: null,
      notFound: true
    }
    return this.theCurrentView;
  }

  showIndex(evt?: any) {
    if (evt) {
      evt.preventDefault();
    }
    this.theCurrentView = {
      title: this.model.main.title,
      componentName: null,
      project: null,
      module: null,
      notFound: false
    }
    return this.theCurrentView;
  }

  serializeView(view: CurrentView): CurrentState {
    const {
      title,
      componentName,
      project,
      module,
      notFound
    } = view;
    return {
      title,
      componentName,
      notFound,
      project: project.slug,
      module: module && module.slug
    };
  }

  deserializeState(state: CurrentState): CurrentView {
    const {
      title,
      componentName,
      project,
      module,
      notFound
    } = state;
    return {
      title,
      componentName,
      notFound,
      project: this.docsService.fetchProject(project),
      module: this.docsService.fetchModule(module, project)
    };
  }

  showProject(projectId) {
    const componentName = 'project-landing';
    let project = this.docsService.fetchProject(projectId);
    let module = null;

    if (!project) {
      return this.show404();
    }

    this.theCurrentView = {
      title: `${this.model.main.title} - ${project.name}`,
      componentName,
      project,
      module
    };

    let name = this.theCurrentView.project.name;
    let url = `${rootUrl}${PROJECT_PATH_LABEL}/${projectId}`;
    return this.serializeView(this.theCurrentView);
  }

  showModule(projectId, moduleId) {
    const componentName = 'module-landing';
    let project = this.docsService.fetchProject(projectId);
    let module = this.docsService.fetchModule(moduleId, projectId);

    if (!project || !module) {
      return this.show404();
    }

    this.theCurrentView = {
      title: `${this.model.main.title} - ${module.name}`,
      componentName,
      project,
      module
    };

    let stateObj = { componentName, projectId, moduleId };
    let name = this.theCurrentView.project.name;
    let url = `${rootUrl}${PROJECT_PATH_LABEL}/${projectId}/${MODULE_PATH_LABEL}/${moduleId}`;
    return this.serializeView(this.theCurrentView);
  }
}
