import Component, { tracked } from "@glimmer/component";

interface Args {
  methods: any;
}

export default class MyComponent extends Component {
  args: Args;

  get categories() {
    let categories = {};
    let methods = this.args.methods;

    for (let method of methods) {
      let categoryName = method.category || 'Other Methods';

      let category = categories[categoryName];
      if (!category) {
        category = categories[categoryName] = {
          name: categoryName,
          slug: slugFor(categoryName),
          methods: []
        }
      }

      console.log(method);
      category.methods.push(method);
    }
    
    return Object.keys(categories)
      .map(k => categories[k]);
  }
}

function slugFor(name: string) {
 return name.toLowerCase().replace(/\s/g, '-');
}
