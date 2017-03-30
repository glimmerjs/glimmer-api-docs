export interface ResourceIdMap {
  moduleId: string,
  projectId: string
}

export const MODULE_PATH_LABEL = 'modules';
export const PROJECT_PATH_LABEL = 'projects';

export function getIdsFromPath(path: string): ResourceIdMap {
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