import validates, { MapErrorTransform, and, chain, extend, factoryForCallback, mapError, or } from '@cross-check/dsl';
import { email, factory, isEmail, presence, str, uniqueness } from './support';

function validationCallback() {
  /* no-op */
}

QUnit.module('DSL');

QUnit.test('basic DSL', assert => {
  assert.deepEqual(validates(str()), {
    factory: factory('str'),
    options: undefined,
    contexts: []
  });

  assert.deepEqual(validates(email({ tlds: ['.com', '.net', '.org', '.edu', '.gov'] })), {
    factory: factory('email'),
    options: { tlds: ['.com', '.net', '.org', '.edu', '.gov'] },
    contexts: []
  });
});

QUnit.test('andAlso', assert => {
  let validations = validates(
    str()
      .andAlso(email({ tlds: ['.com', '.net', '.org', '.edu', '.gov'] }))
      .andAlso(uniqueness())
      .andAlso(validationCallback)
  );

  let expected = {
    factory: and,
    options: [
      {
        factory: factory('str'),
        options: undefined,
        contexts: []
      }, {
        factory: factory('email'),
        options: { tlds: ['.com', '.net', '.org', '.edu', '.gov'] },
        contexts: []
      }, {
        factory: factory('uniqueness'),
        options: undefined,
        contexts: []
      }, {
        factory: factoryForCallback,
        options: validationCallback,
        contexts: []
      }
    ],
    contexts: []
  };

  assert.deepEqual(validations, expected);
});

QUnit.test('or', assert => {
  let validations = validates(
    str()
      .or(email({ tlds: ['.com', '.net', '.org', '.edu', '.gov'] }))
      .or(uniqueness())
      .or(validationCallback)
  );

  let expected = {
    factory: or,
    options: [
      {
        factory: factory('str'),
        options: undefined,
        contexts: []
      }, {
        factory: factory('email'),
        options: { tlds: ['.com', '.net', '.org', '.edu', '.gov'] },
        contexts: []
      }, {
        factory: factory('uniqueness'),
        options: undefined,
        contexts: []
      }, {
        factory: factoryForCallback,
        options: validationCallback,
        contexts: []
      }
    ],
    contexts: []
  };

  assert.deepEqual(validations, expected);
});

QUnit.test('andThen', assert => {
  let validations = validates(
    str()
      .andThen(isEmail({ tlds: ['.com', '.net', '.org', '.edu', '.gov'] }))
      .andThen(uniqueness())
      .andThen(validationCallback)
  );

  let expected = {
    factory: chain,
    options: [
      {
        factory: factory('str'),
        options: undefined,
        contexts: []
      }, {
        factory: factory('isEmail'),
        options: { tlds: ['.com', '.net', '.org', '.edu', '.gov'] },
        contexts: []
      }, {
        factory: factory('uniqueness'),
        options: undefined,
        contexts: []
      }, {
        factory: factoryForCallback,
        options: validationCallback,
        contexts: []
      }
    ],
    contexts: []
  };

  assert.deepEqual(validations, expected);
});

QUnit.test('catch', assert => {
  const mapper: MapErrorTransform = () => [];

  let validations = validates(
    str()
      .andThen(isEmail({ tlds: ['.com', '.net', '.org', '.edu', '.gov'] }))
      .andThen(uniqueness())
      .catch(mapper)
  );

  let expected = {
    factory: mapError,
    options: {
      transform: mapper,
      descriptor: {
        factory: chain,
        options: [
          {
            factory: factory('str'),
            options: undefined,
            contexts: []
          }, {
            factory: factory('isEmail'),
            options: { tlds: ['.com', '.net', '.org', '.edu', '.gov'] },
            contexts: []
          }, {
            factory: factory('uniqueness'),
            options: undefined,
            contexts: []
          }
        ],
        contexts: []
      }
    },
    contexts: []
  };

  assert.deepEqual(validations, expected);
});

QUnit.test('validation contexts', assert => {
  assert.throws(
    () => str().on(),
    /must provide at least one validation context/
  );

  let validations = validates(
    str()
      .andAlso(email({ tlds: ['.com'] }))
      .on('create', 'update')
      .andAlso(uniqueness().on('update'))
      .on('create', 'update', 'destroy')
  );

  let expected = {
    factory: and,
    options: [{
      factory: and,
      options: [{
        factory: factory('str'),
        options: undefined,
        contexts: []
      }, {
        factory: factory('email'),
        options: { tlds: ['.com'] },
        contexts: []
      }],
      contexts: ['create', 'update']
    }, {
      factory: factory('uniqueness'),
      options: undefined,
      contexts: ['update']
    }],
    contexts: ['create', 'update', 'destroy']
  };

  assert.deepEqual(validations, expected);
});

QUnit.test('extend', assert => {
  let mapper: MapErrorTransform = () => [];

  let validations = validates(
    presence().andThen(str())
  );

  let extended = validates(
    extend(validations)
      .andThen(isEmail({ tlds: ['.com'] }))
      .andAlso(uniqueness().on('create'))
      .catch(mapper)
  );

  let expected = {
    factory: mapError,
    options: {
      transform: mapper,
      descriptor: {
        factory: and,
        options: [{
          factory: chain,
          options: [{
            factory: factory('presence'),
            options: undefined,
            contexts: []
          }, {
            factory: factory('str'),
            options: undefined,
            contexts: []
          }, {
            factory: factory('isEmail'),
            options: { tlds: ['.com'] },
            contexts: []
          }],
          contexts: []
        }, {
          factory: factory('uniqueness'),
          options: undefined,
          contexts: ['create']
        }],
        contexts: []
      }
    },
    contexts: []
  };

  assert.deepEqual(extended, expected);
});

QUnit.test('"andAlso" does not mutate previously defined builder', assert => {
  let present = presence();
  let presentAndEmail = present.andAlso(email({ tlds: ['.com'] }));
  let presentAndUnique = present.andAlso(uniqueness());

  assert.deepEqual(validates(present), {
      factory: factory('presence'),
      options: undefined,
      contexts: []
  });

  assert.deepEqual(validates(presentAndEmail), {
    factory: and,
    options: [
      {
        factory: factory('presence'),
        options: undefined,
        contexts: []
      }, {
        factory: factory('email'),
        options: { tlds: ['.com'] },
        contexts: []
      }
    ],
    contexts: []
  });

  assert.deepEqual(validates(presentAndUnique), {
    factory: and,
    options: [
      {
        factory: factory('presence'),
        options: undefined,
        contexts: []
      }, {
        factory: factory('uniqueness'),
        options: undefined,
        contexts: []
      }
    ],
    contexts: []
  });
});

QUnit.test('"or" does not mutate previously defined builder', assert => {
  let present = presence();
  let presentAndEmail = present.or(email({ tlds: ['.com'] }));
  let presentAndUnique = present.or(uniqueness());

  assert.deepEqual(validates(present), {
      factory: factory('presence'),
      options: undefined,
      contexts: []
  });

  assert.deepEqual(validates(presentAndEmail), {
    factory: or,
    options: [
      {
        factory: factory('presence'),
        options: undefined,
        contexts: []
      }, {
        factory: factory('email'),
        options: { tlds: ['.com'] },
        contexts: []
      }
    ],
    contexts: []
  });

  assert.deepEqual(validates(presentAndUnique), {
    factory: or,
    options: [
      {
        factory: factory('presence'),
        options: undefined,
        contexts: []
      }, {
        factory: factory('uniqueness'),
        options: undefined,
        contexts: []
      }
    ],
    contexts: []
  });
});

QUnit.test('"andThen" does not mutate previously defined builder', assert => {
  let present = presence();
  let presentAndEmail = present.andThen(isEmail({ tlds: ['.com'] }));
  let presentAndUnique = present.andThen(uniqueness());

  assert.deepEqual(validates(present), {
    factory: factory('presence'),
    options: undefined,
    contexts: []
  });

  assert.deepEqual(validates(presentAndEmail), {
    factory: chain,
    options: [
      {
        factory: factory('presence'),
        options: undefined,
        contexts: []
      }, {
        factory: factory('isEmail'),
        options: { tlds: ['.com'] },
        contexts: []
      }
    ],
    contexts: []
  });

  assert.deepEqual(validates(presentAndUnique), {
    factory: chain,
    options: [
      {
        factory: factory('presence'),
        options: undefined,
        contexts: []
      }, {
        factory: factory('uniqueness'),
        options: undefined,
        contexts: []
      }
    ],
    contexts: []
  });
});

QUnit.test('"on" does not mutate previously defined builder', assert => {
  let present = presence();
  let presentOnCreate = present.on('create');
  let presentOnUpdate = present.on('update');

  assert.deepEqual(validates(present), {
    factory: factory('presence'),
    options: undefined,
    contexts: []
  });

  assert.deepEqual(validates(presentOnCreate), {
    factory: factory('presence'),
    options: undefined,
    contexts: ['create']
  });

  assert.deepEqual(validates(presentOnUpdate), {
    factory: factory('presence'),
    options: undefined,
    contexts: ['update']
  });
});
