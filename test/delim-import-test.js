var api = require('../'),
    deepStrictEqual = require('deep-eql'),
    utils = api.utils,
    assert = require('assert');

function stringifyEqual(a, b) {
  assert.equal(JSON.stringify(a), JSON.stringify(b));
}

function fixPath(p) {
  return require('path').join(__dirname, p);
}

describe('mapshaper-delim-import.js', function() {

  function importRecords(str, opts) {
      var dataset = api.internal.importDelim(str, opts);
      return dataset.layers[0].data.getRecords();
  }

  describe('importDelim()', function() {
    it('handle empty  fields', function() {
      var csv = "number,name\n3,foo\n,\n";
      var records = importRecords(csv);
      var target = [{number: 3, name: 'foo'}, {number: null, name: ''}];
      assert(deepStrictEqual(records, target));
    })

    it('detect numeric field when first record is empty', function() {
      var str = 'a,b,c\n,"",0\n3,4,5';
      var records = importRecords(str);
      var target = [{a:null, b:null, c:0}, {a:3, b:4, c:5}];
      assert(deepStrictEqual(records, target));
    })

    it('detect numeric field when whitespace is present', function() {
      var str = 'a\tb\tc\n 3\t4 \t  5  ';
      var records = importRecords(str);
      var target = [{a:3, b:4, c:5}];
      assert(deepStrictEqual(records, target));
    })

    it('detect string field when first value looks like a number', function() {
      var str = 'a,b\n2,0\n4a,8x';
      var records = importRecords(str);
      var target = [{a:'2', b:'0'}, {a:'4a', b:'8x'}];
      assert(deepStrictEqual(records, target));
    })

    it('retain whitespace in string fields', function() {
      var str = 'a,b,c\n" ", , a ';
      var records = importRecords(str);
      var target = [{a:' ', b:' ', c:' a '}];
      assert(deepStrictEqual(records, target));
    })

    it('type hints prevent auto-detection of number fields', function() {
      var str = 'a\tb\tc\n3\t4\t5';
      var records = importRecords(str, {field_types: ['a:str','b:string']});
      var target = [{a:"3", b:"4", c:5}];
      assert(deepStrictEqual(records, target));
    })

    it('type hints force numeric conversion', function() {
      var str = 'a\tb\tc\nfour\t\t5';
      var records = importRecords(str, {field_types: ['a:num','b:number']});
      var target = [{a:null, b:null, c:5}];
      assert(deepStrictEqual(records, target));
    })

    it('ignore unnamed columns', function() {
      stringifyEqual(importRecords('\n\n'), [{}]);
      stringifyEqual(importRecords(',foo,\na,b,c\n'), [{foo:'b'}]);
    })

   it('ignore whitespace column names', function() {
      stringifyEqual(importRecords(' ,  ,foo, \na,b,c,d\n'), [{foo: 'c'}]);
    })

  })


  describe('infer export delimiter from filename, if possible', function () {
    it('.tsv implies tab-delimited text', function (done) {
      var cmd = '-i test/test_data/text/two_states.csv -o output.tsv';
      api.applyCommands(cmd, {}, function(err, output) {
        assert.ok(output['output.tsv'].indexOf('\t') > -1); // got tabs
        done();
      })
    })

    it('use input delimiter if export filename is ambiguous', function (done) {
      var cmd = '-i test/test_data/text/two_states.csv -o output.txt';
      api.applyCommands(cmd, {}, function(err, output) {
        var o = output[0];
        assert.ok(output['output.txt'].indexOf(',') > -1); // got commas
        done();
      })
    })

    it('use comma as default delimiter if other methods fail', function (done) {
      var cmd = '-i test/test_data/two_states.shp -o output.txt';
      api.applyCommands(cmd, {}, function(err, output) {
        var o = output[0];
        assert.ok(output['output.txt'].indexOf(',') > -1); // got commas
        done();
      })
    })

    it('.csv in output filename implies comma-delimited text', function (done) {
      var cmd = '-i test/test_data/text/two_states.tsv -o output.csv';
      api.applyCommands(cmd, {}, function(err, output) {
        var o = output[0];
        assert.ok(output['output.csv'].indexOf(',') > -1); // got commas
        done();
      })
    })
  })

  describe('Importing dsv with encoding= option', function() {
    it ('utf16 (be)', function(done) {
      var cmd = '-i test/test_data/text/utf16.txt encoding=utf16';
      api.internal.testCommands(cmd, function(err, data) {
        assert.deepEqual(data.layers[0].data.getRecords(), [{NAME: '国语國語'}])
        done();
      });
    })

    it ('utf16 (be) with BOM', function(done) {
      var cmd = '-i test/test_data/text/utf16bom.txt encoding=utf16';
      api.internal.testCommands(cmd, function(err, data) {
        var rec = data.layers[0].data.getRecords()[0];
        assert.deepEqual(rec, {NAME: '国语國語'})
        done();
      });
    })

    it ('utf16be with BOM', function(done) {
      var cmd = '-i test/test_data/text/utf16bom.txt encoding=utf-16be';
      api.internal.testCommands(cmd, function(err, data) {
        var rec = data.layers[0].data.getRecords()[0];
        assert.deepEqual(rec, {NAME: '国语國語'})
        done();
      });
    })

    it ('utf16le with BOM', function(done) {
      var cmd = '-i test/test_data/text/utf16le_bom.txt encoding=utf16le';
      api.internal.testCommands(cmd, function(err, data) {
        var rec = data.layers[0].data.getRecords()[0];
        assert.deepEqual(rec, {NAME: '国语國語'})
        done();
      });
    })

    it ('utf8 with BOM', function(done) {
      var cmd = '-i test/test_data/text/utf8bom.txt';
      api.internal.testCommands(cmd, function(err, data) {
        var rec = data.layers[0].data.getRecords()[0];
        assert.deepEqual(rec, {NAME: '国语國語'})
        done();
      });
    })

  })

  describe('Importing dsv with -i command', function () {
    it('-i field-types= works with :str type hint', function (done) {
      var input = "fips\n00001";
      api.applyCommands('-i field-types=fips:str', input, function(err, output) {
        if (err) throw err;
        assert.equal(err, null);
        assert.equal(output, "fips\n00001");
        done();
      });
    })
  })

  describe('parseNumber()', function() {
    it('undefined -> null', function() {
      assert.strictEqual(utils.parseNumber(undefined), null);
    })

    it ('"" -> null', function() {
      assert.strictEqual(utils.parseNumber(""), null);
    })

    it ('"1e3" -> 1000', function() {
      assert.equal(utils.parseNumber('1e3'), 1000);
    })

    it('parses decimal numbers', function() {
      assert.equal(utils.parseNumber('-43.2'), -43.2)
    })

    it('parses decimal numbers with positive sign', function() {
      assert.equal(utils.parseNumber('+43.2'), 43.2)
    })

    it('parses numbers with spaces', function() {
      assert.equal(utils.parseNumber('-2.0  '), -2)
      assert.strictEqual(utils.parseNumber('  0'), 0)
    })

    it('identifies numbers with comma delimiters', function() {
      assert.strictEqual(utils.parseNumber('3,211'), 3211)
      assert.strictEqual(utils.parseNumber('-2,000,000.0  '), -2e6)
    })

    it('identifies scientific notation', function() {
      assert.strictEqual(utils.parseNumber('1.3e3'), 1.3e3);
    })

    it('reject alphabetic words', function() {
      assert.strictEqual(utils.parseNumber('Alphabet'), null)
    })

    it('parse hex numbers', function() {
      assert.strictEqual(utils.parseNumber('0xcc'), 0xcc);
    })

    it('reject empty strings', function() {
      assert.strictEqual(utils.parseNumber(''), null)
      assert.strictEqual(utils.parseNumber(' '), null)
    })

    it('rejects street addresses', function() {
      assert.strictEqual(utils.parseNumber('312 Orchard St'), null);
    })

    it('rejects dates', function() {
      assert.strictEqual(utils.parseNumber('2013-12-03'), null);
    })

    // TODO: European decimals?
  })

  describe('guessDelimiter()', function () {
    it('guesses CSV', function () {
      assert.equal(api.internal.guessDelimiter("a,b\n1,2"), ',');
    })

    it("guesses TSV", function() {
      assert.equal(api.internal.guessDelimiter("a\tb\n1,2"), '\t');
    })

    it("guesses pipe delim", function() {
      assert.equal(api.internal.guessDelimiter("a|b\n1,2"), '|');
    })

    it("guesses semicolon delim", function() {
      assert.equal(api.internal.guessDelimiter("a;b\n1;2"), ';');
    })
  })

  describe('parseFieldHeaders', function () {
    it('identify number and string types', function () {
      var index = {};
      var fields = "fips:string,count:number,other".split(',');
      fields = api.internal.parseFieldHeaders(fields, index);
      assert.deepEqual(fields, ['fips', 'count', 'other']);
      assert.deepEqual(index, {fips: 'string', count: 'number'})
    })

    it('accept alternate type names', function () {
      var fields = "fips:s,count:n,other:STR".split(',');
      var index = {};
      fields = api.internal.parseFieldHeaders(fields, index);
      assert.deepEqual(fields, ['fips', 'count', 'other']);
      assert.deepEqual(index, {fips: 'string', count: 'number', other: 'string'})
    })

    it('accept + prefix for numeric types', function () {
      var index = {};
      var fields = "+count,+other".split(',');
      fields = api.internal.parseFieldHeaders(fields, index);
      assert.deepEqual(fields, ['count', 'other']);
      assert.deepEqual(index, {count: 'number', other: 'number'})
    })

    it('accept inconsistent type hints', function () {
      var fields = "fips,count,fips:str".split(',');
      var index = {};
      fields = api.internal.parseFieldHeaders(fields, index);
      assert.deepEqual(fields, ['fips', 'count', 'fips']);
      assert.deepEqual(index, {fips: 'string'})
    })

    it('accept inconsistent type hints 2', function () {
      var fields = "fips:str,count,fips".split(',');
      var index = {};
      fields = api.internal.parseFieldHeaders(fields, index);
      assert.deepEqual(fields, ['fips', 'count', 'fips']);
      assert.deepEqual(index, {fips: 'string'})
    })
  })

  describe('adjustRecordTypes()', function () {
    it('convert numbers by default', function () {
      var records = [{foo:"0", bar:"4,000,300", baz: "0xcc", goo: '300 E'}],
          fields = ['foo', 'bar', 'baz', 'goo']
      api.internal.adjustRecordTypes(records, fields);
      stringifyEqual(records, [{foo:0, bar:4000300, baz: 0xcc, goo: '300 E'}])
    })

    it('protect string-format numbers with type hints', function() {
      var records = [{foo:"001", bar:"001"}],
          fields = ['foo:string', 'bar'];
      api.internal.adjustRecordTypes(records, fields);
      stringifyEqual(records, [{foo:"001", bar:1}])
    })

    it('bugfix 1: handle numeric data (e.g. from dbf)', function() {
      var records = [{a: 0, b: 23.2, c: -12}],
          fields = ['a', 'b:number', 'c'];
      api.internal.adjustRecordTypes(records, fields);
      stringifyEqual(records, [{a: 0, b: 23.2, c: -12}])
    })

  })

  describe('importDelim()', function () {
    it('should detect tab delimiter', function () {
      var str = 'a\tb\n1\t"boo ya"'
      var dataset = api.internal.importDelim(str);
      stringifyEqual(dataset.layers[0].data.getRecords(), [{a: 1, b: 'boo ya'}]);
      assert.equal(dataset.info.input_delimiter, '\t')
    })
  })

  describe('importDelimTable()', function () {
    it('test 1', function () {
      var str = 'a,b\n"1","2"';
      var data = api.internal.importDelimTable(str, ',');
      stringifyEqual(data.getRecords(), [{a: 1, b: 2}]);
    })

    it('parse csv with quoted field including comma', function () {
      var str = 'a,b\n1,"foo, bar"'
      var data = api.internal.importDelimTable(str, ',');
      stringifyEqual(data.getRecords(), [{a: 1, b: 'foo, bar'}]);
    })

    it('import tab-delim, quoted string', function () {
      var str = 'a\tb\n1\t"boo ya"'
      var data = api.internal.importDelimTable(str, '\t');
      stringifyEqual(data.getRecords(), [{a: 1, b: 'boo ya'}]);
    })

    it('import pipe-delim, trailing newline', function () {
      var str = 'a|b\n1|"boo"\n'
      var data = api.internal.importDelimTable(str, '|');
      stringifyEqual(data.getRecords(), [{a: 1, b: 'boo'}]);
    })

    it('import single column of values w/ mixed return types', function () {
      var str = 'a\n1\r\n0\r30'
      var data = api.internal.importDelimTable(str, ',');
      stringifyEqual(data.getRecords(), [{a: 1}, {a: 0}, {a: 30}]);
    })

  })

});
