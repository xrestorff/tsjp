type JsonValue =
  | null
  | boolean
  | string
  | number
  | JsonValue[]
  | { [key: string]: JsonValue };

type ParseResult<T> =
  | { state: "Ok"; result: [string, T] }
  | { state: "Err"; input: string };

type Parser<T> = (input: string) => ParseResult<T>;

function literal(value: string): Parser<null> {
  return (input: string) =>
    input.startsWith(value)
      ? { state: "Ok", result: [input.slice(value.length), null] }
      : { state: "Err", input };
}

function pair<T1, T2>(
  parser1: Parser<T1>,
  parser2: Parser<T2>,
): Parser<[T1, T2]> {
  return (input: string) => {
    const parseResult1 = parser1(input);
    if (parseResult1.state == "Err") {
      return parseResult1;
    }
    const [restInput1, result1] = parseResult1.result;
    const parseResult2 = parser2(restInput1);
    if (parseResult2.state == "Err") {
      return parseResult2;
    }
    const [restInput2, result2] = parseResult2.result;
    return {
      state: "Ok",
      result: [restInput2, [result1, result2]],
    };
  };
}

function map<T1, T2>(parser: Parser<T1>, mapFn: (a: T1) => T2): Parser<T2> {
  return (input: string) => {
    const r1 = parser(input);
    if (r1.state === "Err") {
      return r1;
    }
    const [rest, result] = r1.result;
    return { ...r1, result: [rest, mapFn(result)] };
  };
}

function left<T1, T2>(parser1: Parser<T1>, parser2: Parser<T2>) {
  return map(pair(parser1, parser2), ([left, _right]) => left);
}

function right<T1, T2>(parser1: Parser<T1>, parser2: Parser<T2>) {
  return map(pair(parser1, parser2), ([_left, right]) => right);
}

function wrap<T>(before: string, parser: Parser<T>, after: string): Parser<T> {
  return right(literal(before), left(parser, literal(after)));
}

function pred<T>(
  parser: Parser<T>,
  predFn: (result: T) => boolean,
): Parser<T> {
  return (input: string) => {
    const parseResult = parser(input);
    if (parseResult.state === "Err") {
      return parseResult;
    }
    if (!predFn(parseResult.result[1])) {
      return { state: "Err", input: input };
    }
    return parseResult;
  };
}

function anyChar(): Parser<string> {
  return (input: string) =>
    input.length
      ? { state: "Ok", result: [input.slice(1), input[0]] }
      : { state: "Err", input };
}

function zeroOrMore<T>(parser: Parser<T>): Parser<T[]> {
  return (input: string) => {
    const results = [];
    let restInput = input;
    while (true) {
      const parseResult = parser(restInput);
      if (parseResult.state == "Err") {
        break;
      }
      const [newRestInput, result] = parseResult.result;
      results.push(result);
      restInput = newRestInput;
    }
    return { state: "Ok", result: [restInput, results] };
  };
}

function oneOrMore<T>(parser: Parser<T>): Parser<T[]> {
  return map(
    pair(parser, zeroOrMore(parser)),
    ([head, tail]) => [head, ...tail],
  );
}

function whitespace(): Parser<string> {
  return pred(anyChar(), (char) => char.trim() == "");
}

function wrapWhitespace<T>(parser: Parser<T>): Parser<T> {
  return right(
    zeroOrMore(whitespace()),
    left(parser, zeroOrMore(whitespace())),
  );
}

function separateBy<T>(parser: Parser<T>, sep: string): Parser<T[]> {
  return map(
    pair(parser, zeroOrMore(right(literal(sep), parser))),
    ([head, tail]) => [head, ...tail],
  );
}

function either<T>(parsers: (() => Parser<T>)[]): Parser<T> {
  return (input: string) => {
    for (const parser of parsers) {
      const parseResult = parser()(input);
      if (parseResult.state == "Ok") {
        return parseResult;
      }
    }
    return { state: "Err", input };
  };
}

function nullParser(): Parser<null> {
  return map(
    literal("null"),
    (_) => (null),
  );
}

function boolParser(): Parser<boolean> {
  return either([
    () => map(literal("true"), (_) => (true)),
    () => map(literal("false"), (_) => (false)),
  ]);
}

// cannot parse escaped characters
function stringParser(): Parser<string> {
  return wrap(
    '"',
    map(
      zeroOrMore(pred(anyChar(), (char) => char !== '"')),
      (chars) => chars.join(""),
    ),
    '"',
  );
}

// can only parse positive integers
function numberParser(): Parser<number> {
  return map(
    oneOrMore(pred(anyChar(), (char) => !isNaN(parseInt(char)))),
    (chars) => parseInt(chars.join("")),
  );
}

function arrayParser(): Parser<JsonValue> {
  return wrap("[", separateBy(jsonParser(), ","), "]");
}

function objectParser(): Parser<JsonValue> {
  return wrap(
    "{",
    map(
      separateBy(
        pair(left(wrapWhitespace(stringParser()), literal(":")), jsonParser()),
        ",",
      ),
      (pairs) =>
        pairs.reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {}),
    ),
    "}",
  );
}

function jsonParser(): Parser<JsonValue> {
  return wrapWhitespace(either([
    nullParser,
    boolParser,
    stringParser,
    numberParser,
    arrayParser,
    objectParser,
  ]));
}

export function parseJson(input: string): JsonValue {
  const parser = jsonParser();
  const parseResult = parser(input);
  if (parseResult.state === "Err") throw new Error(parseResult.input);
  const [restInput, result] = parseResult.result;
  if (restInput.length) throw new Error(restInput);
  return result;
}
