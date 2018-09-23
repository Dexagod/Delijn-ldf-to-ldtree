const jsonld = require('jsonld');
const Rtree = require('rtree-ldf');
const Ptree = require('rdf-patricia-tree')
const gbfs2ld = require('gbfs2ld');
const url = require('url');
const csv = require('csv-parser');
const request = require('request');

const systems = 'https://raw.githubusercontent.com/NABSA/gbfs/master/systems.csv';

// Parses csv file and extracts all systems
process.env.UV_THREADPOOL_SIZE = 128;
function getSystems(url) {
    return new Promise((resolve, reject) => {
        let result = [];
        request(systems)
            .pipe(csv())
            .on('data', function (data) {
                result.push(data['Auto-Discovery URL']);
            })
            .on('finish', () => {
                resolve(result);
            });
    });
}

// Creates a url template for the system entities
function createTemplate(site) {
    let parsed = url.parse(site);
    let base = `${parsed.protocol}//${parsed.hostname}${parsed.path}`;
    return {
        "system": `${base}/system`,
        "stations": `${base}/station/`,
        "bikes": `${base}/bike/`,
        "system_hours": `${base}/system_hours/`,
        "regions": `${base}/region/`,
        "alerts": `${base}/alert/`,
        "calendars": `${base}/calendar/`,
        "plans": `${base}/plan/`
    };
}

// Create rtree
const tree = new Rtree({
    dir: './db',
    cacheSize: 100000,
    maxEntries: 16
});
let ptree = new Ptree();
let sourceDir = "/home/dexa/vakantiejob/opendata/"
let dataDir = "gbfsdata/"
let collectionDir = "gbfs/"
let collectionFile = "gbfsstrings"
let pattree = ptree.createTree(sourceDir, dataDir, 10000, 35)

getSystems(systems).then((systems) => {
    return systems.map((system) => {

        // Convert systems to linked data
        return gbfs2ld({
            autodiscoveryFile: system,
            urisTemplate: createTemplate(system),
            format: 'application/n-quads'
        }).then((result) => {
            console.log(`Successfully converted ${system}`);
            return result;
        }).catch(err => {
            console.err(`Failed to convert ${system}`);
            return;
        });
    })
}).then((promises) => {
    return Promise.all(promises);
}).then((quads) => {
    // Parse result (nquads) into json-ld
    return jsonld.fromRDF(quads.join('\n'), {format: 'application/n-quads'});
}).then((result) => {
    // Insert items into tree
    result.forEach((graph) => {
        if (graph["@graph"] !== undefined) { // TODO: handle case when no graph is present
            graph["@graph"].forEach((item) => {
                // Only insert stations
                if (item["@type"] !== undefined && item["@type"][0] === 'http://example.com/terms#Station') {
                    let lat = item["http://www.w3.org/2003/01/geo/wgs84_pos#lat"];
                    let long = item["http://www.w3.org/2003/01/geo/wgs84_pos#long"];
                    if (lat && long) {
                        item.minX = long[0]["@value"];
                        item.maxX = long[0]["@value"];
                        item.minY = lat[0]["@value"];
                        item.maxY = lat[0]["@value"];
                        tree.insert(item);
                        if (item.hasOwnProperty('http://example.com/terms#short_name')) {
                            let found = false;
                            item['http://example.com/terms#short_name'].forEach(element => {
                                if (element.hasOwnProperty("@language") && element["@language"] == "en"){
                                    found = true;
                                    pattree.addData(element["@value"], item)
                                }
                            });
                            if (! found){
                                pattree.addData(item['http://example.com/terms#short_name'][0]["@value"], item)
                            }
                        } else {
                            let found = false;
                            item['http://example.com/terms#name'].forEach(element => {
                                if (element.hasOwnProperty("@language") && element["@language"] == "en"){
                                    found = true;
                                    pattree.addData(element["@value"], item)
                                }
                            });
                            if (! found){
                                pattree.addData(item['http://example.com/terms#name'][0]["@value"], item)
                            }
                        }
                    }
                }
            })
        }
    })
}).then(() => {

    // Convert tree into linked data fragments
    
    pattree.doneAdding();

    ptree.writeTree(pattree, collectionDir, collectionFile)
    tree.toFragments({
        outDir: sourceDir,
        treeDir: '/gbfstreeloc/',
        dataDir: '/gbfsdataloc/',
        collection: "/gbfs/gbfslocations.jsonld" ,
        manages: 'http://example.com/terms#Station'
    });
    
    tree.close();
});