# Multilevel Visual Analysisof ManyGeo-Networks

[Paper Link](https://zjuidg.org/source/projects/VisCas/VisCas.pdf)

Abstract: ...


## Installation

### Prerequisites

#### node
* Node.js: 16.17.0
* ts-node: 10.7.0
* nodemon: 2.0.19
* TypeScript: 4.1.6
* react: 17.0.2
* leaflet: 1.7.1

#### python
* pulp: 2.6.0
* numpy: 1.19.5
* Google Chrome

### Install

Install nodemon by using npm (the recommended way):

```...\GeoNetverse> npm install -g nodemon
```

```...\GeoNetverse> npm install ts-node -g 
```

Install packges of fronetend by using npm (the recommended way): enter GeoNetverse/frotend

```...\GeoNetverse\frontend> npm install
```

### Data Processing

To start with, geo-networks.json and geo-nodes-screen.json are required and placed in ...\GeoNetverse\frontend\public\{datasetName}.
...\GeoNetverse\frontend\server\datasetName.json stores datasetName, to switch the dataset for processing, you only need to change the name in this json file.

Then, you can start data processing by following commands orderly:
```...\GeoNetverse\frontend> ts-node server/processing-1.ts
```

```...\GeoNetverse\frontend> ts-node server/processing-2-ilp-1.ts
```

```...\GeoNetverse\frontend> python server/ilp-scipy.py
```

```...\GeoNetverse\frontend> ts-node server/processing-2-ilp-2.ts
```

```...\GeoNetverse\frontend> ts-node server/processing-3.ts
```

### Run

Start backend by:

```shell script
...\GeoNetverse\frontend> nodemon server/app.ts
```

Start frontend by (open another shell): 

```shell script
...\GeoNetverse\frontend> npm start
```

GeoNetverse can now be accessed via http://localhost:3000 with Chrome.

## Dataset switch

There are two datasets, Zhengzhou and Hefei

```shell script
...\GeoNetverse\frontend>src>components>Map>Map.tsx(line: 97)>constructor>datasetIndex
```

* Change the value of datasetIndex to switch
* 0： Zhengzhou
* 1： Hefei
