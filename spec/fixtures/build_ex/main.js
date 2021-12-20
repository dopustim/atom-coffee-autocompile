var a, num;

a = function() {
    var i, results;
    results = [];
    for (num = i = 0; i <= 5; num = ++i) {
        if (num % 2 === 0) {
            results.push(num);
        }
    }
    return results;
}();
