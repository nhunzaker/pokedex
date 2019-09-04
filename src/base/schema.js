function isKey(directive) {
  return directive.name.value === "key";
}

function getName(object) {
  return object.name.value;
}

export function buildSchema(schema) {
  const types = {};

  for (let type of schema.definitions) {
    const entry = {
      key: null,
      name: getName(type),
      fields: {},
      toString() {
        return this.name;
      }
    };

    for (let field of type.fields) {
      let entryField = {
        name: getName(field),
        type: "",
        isList: false
      };

      entry.fields[getName(field)] = entryField;

      switch (field.type.kind) {
        case "NamedType":
          entryField.type = getName(field.type);
          break;
        case "ListType":
          entryField.type = getName(field.type.type);
          entryField.isList = true;
          break;
      }

      if (field.directives.some(isKey)) {
        if (entry.key != null) {
          throw new Error(
            `Type definition for ${entry} already has a key (${entry.key})!`
          );
        }

        entry.key = getName(field);
      }
    }

    types[entry.name] = entry;
  }

  return types;
}
