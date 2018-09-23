# Delijn-ldf-to-ldtree

This is an example of the creation of linked data trees.

The *DeLijnParser.js* file parses the data of DeLijn stops found on:
- https://belgium.linkedconnections.org/delijn/Antwerpen/stops
- https://belgium.linkedconnections.org/delijn/Oost-Vlaanderen/stops
- https://belgium.linkedconnections.org/delijn/West-Vlaanderen/stops
- https://belgium.linkedconnections.org/delijn/Vlaams-Brabant/stops
- https://belgium.linkedconnections.org/delijn/Limburg/stops

The *GBFSparser.js* file parses bike sharing stops data.
This information is parsed using the npm package
- https://www.npmjs.com/package/gbfs2ld

Both files create a patricia tree with this linked data using the npm package 
- https://www.npmjs.com/package/rdf-patricia-tree
and an rtree using the npm package
- https://www.npmjs.com/package/rtree-ldf

