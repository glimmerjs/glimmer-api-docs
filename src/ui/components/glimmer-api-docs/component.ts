import Component from "@glimmer/component";

export default class MyComponent extends Component {
    get model() {
        return {
            main: { title: "Hello Glimmer" },
            menu: [
                {
                    name: "Ember",
                    children: [
                        { name: "Component" }
                    ]
                }
            ]
        }
    }
}
