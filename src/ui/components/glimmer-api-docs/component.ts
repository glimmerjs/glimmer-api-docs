import Component, { tracked } from "@glimmer/component";
import config from './../../../config/environment';
import { TSAttributesObject } from 'json-typescript-docs';

interface EntityObject extends TSAttributesObject {
  id: string,
  isFunction: boolean;
}

// TODO: get this from environment.js instead of environment.ts
const strippedRootUrl = config.basePath.split('/').filter((str) => !!str).join('/');
const rootUrl = !!strippedRootUrl ? '/' + strippedRootUrl + '/' : '/';

const DATA = window.docs;
const MODULE_PATH_LABEL = 'modules';
const PROJECT_PATH_LABEL = 'projects';

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

function materialize(obj) {
  if (Object.keys(obj).length !== 2 || !obj.id || !obj.type) {
    return obj;
  }
  const found = DATA.included.find((item) => item.id === obj.id && item.type === obj.type);
  return found;
}

function inflateRelationship({ relationships }, key, recurse = false) {
  const v = relationships[key].data.map(materialize);
  return v;
}

function toViewObject(obj): EntityObject {
  return _toViewObject(obj, false);
}

function toInflatedViewObject(obj): EntityObject {
  return _toViewObject(obj, true);
}

function flagsMap(thing) {
  let { flags } = thing;
  if (flags) {
    if (!flags.isPrivate && !flags.isProtected) {
      flags.isPublic = true;
    }
  }
  return thing;
}

function signatureMap(signature) {
  signature.hasBody = signature.comment || signature.parameters;
  return signature;
}

function categoryFor(method: any) {
  for (let signature of method.signatures) {
    let comment = signature.comment;
    let tags = comment && comment.tags;

    if (!tags) { continue; }

    for (let tag of tags) {
      if (tag.tagName === 'category') {
        return tag.text.trim();
      }
    }
  }

  return null;
}

function addViewMeta(attributes) {
  if (attributes.properties) {
    flagsMap(attributes.properties);
  }
  if (attributes.callSignatures) {
    attributes.signatures = attributes.callSignatures.map(signatureMap);
  }
  if (attributes.methods) {
    let hasMethodCategories = false;

    attributes.methods = attributes.methods.map((method) => {
      flagsMap(method);
      if (method.callSignatures) {
        method.signatures = method.callSignatures.map(signatureMap);
      }
      if (method.signatures) {
        let category = categoryFor(method);
        if (category) {
          hasMethodCategories = true;
          method.category = category;
        }
      }
      return method;
    });
    attributes.hasMethodCategories = hasMethodCategories;
  }
  if (attributes.functions) {
    attributes.functions = attributes.functions.map((method) => {
      flagsMap(method);
      if (method.callSignatures) {
        method.signatures = method.callSignatures.map(signatureMap);
      }
      return method;
    });
  }
  if (attributes.constructors) {
    attributes.constructors = attributes.constructors.map((method) => {
      if (method.constructorSignatures) {
        method.signatures = method.constructorSignatures.map(signatureMap);
      }
      return method;
    });
  }
  return attributes;
}

function _toViewObject({ type, id, attributes, relationships }, recurse = false): EntityObject {
  let viewObject = {
    type,
    id,
    kindString: type,
    slug: id,
    alias: id,
    name: id,
    isFunction: type === 'function',
    flags: {
      isPrivate: true,
      isProtected: true,
      isPublic: true,
      isStatic: true,
      isExported: true,
      isExternal: true,
      isOptional: true,
      isRest: true,
      isNormalized: true
    }
  };
  if (!attributes) {
    attributes = materialize({
      id,
      type
    }).attributes;
  }
  attributes = addViewMeta(attributes);

  for (let key in attributes) {
    viewObject[key] = attributes[key];
  }

  for (let key in relationships) {
    let relationship = relationships[key];
    viewObject[key] = recurse ? relationship.data.map(toInflatedViewObject) : relationship.data;
  }

  return <EntityObject>viewObject;
}

function inflate({id, type, attributes, relationships }, recurse = false) {
  let inflated = {};
  for (let key in relationships) {
    inflated[key] = {
      data: inflateRelationship(relationships, key)
    };
  }
  return {
    id,
    type,
    attributes,
    relationships: inflated
  };
}

function toMenuProject(menu) {
  let children = [];
  for (let key in menu) {
    if (Array.isArray(menu[key])) {
      const set = menu[key]
        .filter((obj) => {
          return obj.flags && obj.flags.isNormalized;
        })
        .map(toInflatedViewObject)
      children = children.concat(set);
    }
  }
  menu.children = children.sort((a, b) => a.name > b.name ? 1 : -1).map((child) => {
    if (child.type === 'function') {
      //child.name = child.name + '()';
      child.isFunction = true;
    }
    return child;
  });

  if (menu.menu.include) {
    menu.children = menu.children.filter((child) => menu.menu.include.indexOf(child.name) > -1 );
  }

  if (menu.menu.exclude) {
    menu.children = menu.children.filter((child) => menu.menu.exclude.indexOf(child.name) < 0 );
  }

  return menu;
}

function generateMenu(root) {
  return inflateRelationship(root.data, 'docmodules').map(toInflatedViewObject).map(toMenuProject);
}

class DocsService {
  main = DATA;

  fetchRoot() {
    return {
      main: this.main.data.attributes,
      menu: generateMenu(this.main)
    };
  }

  fetchModule(moduleId, projectId): EntityObject {
    let record = this.main.included.find(({ id }) => id === moduleId);

    if (!record) {
      const realId = this.main.data.attributes.idMap[projectId][moduleId];
      record = this.main.included.find(({ id }) => id === realId);
    }

    if (!record) {
      return null;
    }

    const inflated = toInflatedViewObject(record);
    return inflated;
  }

  fetchProject(projectId): EntityObject {
    return toInflatedViewObject(this.main.included.find(({ type, id }) => type === 'projectdoc' && id === projectId));
  }
};

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

interface ResourceIdMap {
  moduleId: string,
  projectId: string
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

  getIdsFromPath(path: string): ResourceIdMap {
    if (path[0] === '/') {
      path = path.substring(1);
    }
    if (path[path.length-1] === '/') {
      path = path.substring(0, path.length-1);
    }
    let segs = path.split('/');
    if (segs[0] !== PROJECT_PATH_LABEL || (segs.length !== 2 && segs.length !== 4) || (segs.length === 4 && segs[2] !== MODULE_PATH_LABEL)) {
      return {
        moduleId: null,
        projectId: null
      };
    }
    const projectId = segs[1];
    let moduleId = null;
    if (segs.length === 4) {
      moduleId = segs[3];
    }
    return {
      moduleId,
      projectId
    };
  }

  loadFromUrl(url: string) {
    const path = removeBasePath(strippedRootUrl, url);
    const { moduleId, projectId } = this.getIdsFromPath(path);
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
      title: `${project.name}`,
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
      title: `${project.name}`,
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
