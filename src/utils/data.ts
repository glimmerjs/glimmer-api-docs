import { TSAttributesObject } from 'json-typescript-docs';

const DATA = window.docs;

export interface EntityObject extends TSAttributesObject {
  id: string,
  isFunction: boolean;
}

export default class DocsService {
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