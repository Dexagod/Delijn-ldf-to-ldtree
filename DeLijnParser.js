var jsonld = require("jsonld")
var Ptree = require("rdf-patricia-tree")
var jld = new jsonld({});
const Rtree = require('rtree-ldf');




async function convertdata(searchPredicate){

    const geotree = new Rtree({
        dir: './db',
        cacheSize: 100000,
        maxEntries: 16
    });
    
    var ptree = new Ptree();
    let sourceDir = "/home/dexa/vakantiejob/opendata/"
    let dataDir = "stops/"
    let collectionDir = "delijn/"
    let collectionFile = "delijnstops"
    let tree = ptree.createTree(sourceDir, dataDir, 10000, 35)

    let provincies = ["Oost-Vlaanderen", "West-Vlaanderen", "Vlaams-Brabant", "Antwerpen", "Limburg"]
    for (var i = 0; i < provincies.length; i++){
        let provincie = provincies[i]
        console.log(provincie)
        let url = "https://belgium.linkedconnections.org/delijn/" + provincie + "/stops"
        let data = await jld.flatten(url)

        let provincieDataDir = "stops" + provincie + "/"
        let provincieCollectionFile = "delijnstops" + provincie

        let provincietree = ptree.createTree(sourceDir, provincieDataDir, 5000, 50);

        for(var index = 0; index < data.length; index++){
            if (index % 100 === 0){console.log("Line", index)}
            let rep = data[index][searchPredicate][0]["@value"]
            tree.addData(rep, data[index])
            provincietree.addData(rep, data[index])

            let item = data[index]
            let lat = item["http://www.w3.org/2003/01/geo/wgs84_pos#lat"];
            let long = item["http://www.w3.org/2003/01/geo/wgs84_pos#long"];
            if (lat && long) {
                item.minX = long[0]["@value"];
                item.maxX = long[0]["@value"];
                item.minY = lat[0]["@value"];
                item.maxY = lat[0]["@value"];
                geotree.insert(item);
            }

        }
        provincietree.doneAdding();

        ptree.writeTree(provincietree, collectionDir, provincieCollectionFile)

    }

    geotree.toFragments({
        outDir: '../opendata/',
        treeDir: '/stoplocations/',
        dataDir: '/stopsdata/',
        collection: '/delijn/stoplocations.jsonld' ,
        manages: 'http://example.com/terms#Station'
    });


    tree.doneAdding();

    ptree.writeTree(tree, collectionDir, collectionFile)
}

convertdata("http://xmlns.com/foaf/0.1/name")