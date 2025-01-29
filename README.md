# Crown.js

A unified system for managing a dynamic 3D memory substrate, mapping named I/O points, and storing genome/network data—with full support for serialization and deserialization.

##Table of Contents

1. [Introduction](#introduction)  
2. [Features](#features)  
3. [Installation](#installation)  
4. [Usage](#usage)  
   1. [Creating a Crown Instance](#creating-a-crown-instance)  
   2. [Memory Operations](#memory-operations)  
   3. [I/O Mapping](#io-mapping)  
   4. [Network / Genome Pool](#network--genome-pool)  
   5. [Serialization / Deserialization](#serialization--deserialization)  
5. [Example Code](#example-code)  
6. [Advanced Topics](#advanced-topics)  
7. [License](#license)

---

## Introduction

`Crown.js` provides a consolidated way to:

- Maintain a **3D memory** (indexed by `xx, yy, zz`), where each “node” contains a 2D matrix of arbitrary size.
- Map **inputs** and **outputs** (named references) to dynamically allocated addresses in that 3D memory space.
- Store a **network** or **genome pool** that can hold the genetic data, fitness, or any relevant information for evolutionary or dynamic neural network models.
- Easily **serialize** the entire state (memory + I/O maps + network) to JSON and **deserialize** it to resume state later.

This design is particularly suited for experimental AI architectures, multi-genome neural nets, or any system that requires flexible memory addressing and I/O management.
[Back to Contents](#table-of-contents)
---

## Features

1. **3D Memory Substrate**  
   - Index nodes by `(xx, yy, zz)`.  
   - Each node is a 2D array (`node.value[row][col]`).  
   - Automatic expansion when setting values out of current bounds.

2. **I/O Mapping**  
   - Register named inputs/outputs.  
   - Automatically allocates the “next available” 3D address.  
   - Retrieve addresses by name.

3. **Network (Genome) Storage**  
   - Built-in container for storing multiple genomes or network data.  
   - Simple add/remove/list interface for genome objects.

4. **Serialization**  
   - Save the entire state (memory + addresses + network) to a JSON-friendly object.  
   - Restore the state with `fromJSON()` to pick up exactly where you left off.

5. **Expandable & Modular**  
   - Easily extend partitioning logic, concurrency, or custom update rules.  
   - Switch to sparse matrix storage if needed.
[Back to Contents](#table-of-contents)
---

## Installation

To use `Crown.js` in your project:

1. Copy the `Crown.js` file into your source directory.  
2. Import it in your code:

```js
import Crown from './Crown.js';
```

(Adjust the path as needed.)
[Back to Contents](#table-of-contents)
---

## Usage

### Creating a Crown Instance

```js
import Crown from './Crown.js';

const crown = new Crown();
```

This creates:
- An empty memory map (`nodesMap` + `usedAddresses`).  
- Empty I/O mappings (`inputs` + `outputs`).  
- A default `network` object containing a `genomePool`.
[Back to Contents](#table-of-contents)

### Memory Operations

**Create or Get Nodes**

- When you **set** data on an address `(xx, yy, zz)` that doesn’t exist yet, `Crown` will create it.  
- Use `setMatrix(xx, yy, zz, matrix)` to overwrite an entire 2D array.
- Use `getAllData(xx, yy, zz)` to retrieve the entire matrix at that address.

**Expanding Matrices**

- If you **set** a single cell at coordinates that exceed the current matrix’s size, the matrix will **auto-expand**.

**Common Methods**  
- `findNode(xx, yy, zz)`: Returns the node object or undefined.  
- `set(xx, yy, zz, row, col, newValue)`: Creates/expands if needed.  
- `get(xx, yy, zz, row, col)`: Gets a single cell’s value.  
- `getDimensions(xx, yy, zz)`: Returns `[numRows, numCols]` for that node.
[Back to Contents](#table-of-contents)

### I/O Mapping

- **registerInput(name, rows, cols, meta)**: Allocates a node for an *input* named `name`.  
- **registerOutput(name, rows, cols, meta)**: Allocates a node for an *output* named `name`.  
- Both get the “next available” 3D address and store `(xx, yy, zz)` in `this.inputs` or `this.outputs`.

Example:
```js
crown.registerInput("sensorA", 2, 3); // 2x3 matrix
crown.registerOutput("motorB", 1, 1); // single cell
```

To retrieve these addresses:
```js
const sensorAAddr = crown.getInputAddress("sensorA"); 
// => { xx, yy, zz, rows, cols, meta }

const motorBAddr = crown.getOutputAddress("motorB");
```
[Back to Contents](#table-of-contents)

### Network / Genome Pool

`Crown` includes a simple `network` object with a `genomePool` dictionary. You can store arbitrary data (like weights, IDs, fitness, etc.):

- **addGenome(name, data)**: Add a genome to the pool.
- **getGenome(name)**: Retrieve genome data by name.
- **removeGenome(name)**: Remove a genome.
- **listGenomes()**: Get an array of all genome names.

Example:
```js
crown.addGenome("genome1", { fitness: 42, weights: [0.1, 0.2, 0.3] });
const g1 = crown.getGenome("genome1");
console.log(g1.fitness); // 42
```
[Back to Contents](#table-of-contents)

### Serialization / Deserialization

**toJSON()**  
Generates a JavaScript object that includes:

- All memory nodes (with their `(xx, yy, zz)` and matrix data).  
- The set of used addresses.  
- The entire inputs/outputs mapping.  
- The `nextXX`, `nextYY`, `nextZZ` pointers.  
- The `network` object (including `genomePool`).

```js
// Convert the entire Crown state to a JSON string
const stateString = JSON.stringify(crown.toJSON());
```

**fromJSON(serialized)**  
Restores everything from a previously saved state. This **overwrites** any existing data in the Crown instance.

```js
const newCrown = new Crown();
newCrown.fromJSON(JSON.parse(stateString));

// Now 'newCrown' has the same memory, I/O mappings, and genome pool as 'crown'
```
[Back to Contents](#table-of-contents)

---

## Example Code

```js
import Crown from './Crown.js';

// 1) Create an instance
const crown = new Crown();

// 2) Register an input and output
crown.registerInput("sensorA", 2, 3);
crown.registerOutput("motorB", 1, 1);

// 3) Add genome data
crown.addGenome("genome1", { fitness: 42, weights: [0.2, 0.5, 0.9] });

// 4) Write matrix data to the 'sensorA' input
const sensorAAddr = crown.getInputAddress("sensorA");
crown.setMatrix(sensorAAddr.xx, sensorAAddr.yy, sensorAAddr.zz, [
  [10, 20, 30],
  [40, 50, 60],
]);

// 5) Save the entire Crown state to JSON
const savedState = JSON.stringify(crown.toJSON());

// 6) Create a new Crown instance and load the previous state
const crown2 = new Crown();
crown2.fromJSON(JSON.parse(savedState));

// 7) Confirm the data is the same
const sensorA2 = crown2.getInputAddress("sensorA");
console.log("Restored matrix:", crown2.getAllData(sensorA2.xx, sensorA2.yy, sensorA2.zz));
// => [ [10, 20, 30], [40, 50, 60] ]

// 8) Check genomes
console.log("Restored genomes:", crown2.listGenomes()); // => [ "genome1" ]
```
[Back to Contents](#table-of-contents)

---

## Advanced Topics

- **Address Partitioning**  
  Modify `findNextAvailableAddress()` or create custom methods to reserve blocks of `(xx, yy, zz)` for different genome IDs.

- **Sparse Storage**  
  For large matrices mostly filled with zeros, consider storing only non-zero cells.

- **Concurrency / Multi-Threading**  
  In JavaScript, concurrency is generally limited, but if you use Workers or a server environment, you’ll need to manage access carefully (e.g., locks, transactions).

- **Bulk Registration**  
  For large neural layers, you might add a helper method like `registerLayer(genomeId, layerName, neuronCount, rowSize, colSize)`.
[Back to Contents](#table-of-contents)
---

## License

MIT License (or your license of choice). Feel free to modify and use `Crown.js` in your projects. If you share improvements, consider contributing them back to the community!
[Back to Contents](#table-of-contents)
---

*Happy building!*  
_The Crown.js Team_
