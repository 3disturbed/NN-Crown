/**
 * Crown.js
 *
 * A unified module that:
 *  1. Manages a 3D memory (xx, yy, zz), where each node holds a 2D array "value".
 *  2. Provides an I/O mapping layer so that named inputs/outputs map to unique addresses.
 *  3. Includes a "Network" object to store a genome pool.
 *  4. Supports serialization and deserialization (saving/loading) of:
 *     - Memory data
 *     - I/O mappings
 *     - Genome pool in the Network
 */

export default class Crown {
    constructor() {
        // ---------------------------------------------------------------------
        // MEMORY CORE
        // ---------------------------------------------------------------------
        // Use a Map for faster lookups: key = "xx,yy,zz" => node object
        this.nodesMap = new Map();
        this.usedAddresses = new Set();  // Tracks used (xx,yy,zz) addresses

        // ---------------------------------------------------------------------
        // I/O MAPPER
        // ---------------------------------------------------------------------
        // Store name => { xx, yy, zz, rows, cols, meta } for both inputs & outputs
        this.inputs = new Map();
        this.outputs = new Map();

        // Simple linear pointer for "next available" address
        this.nextXX = 0;
        this.nextYY = 0;
        this.nextZZ = 0;

        // ---------------------------------------------------------------------
        // NETWORK (Genome Pool)
        // ---------------------------------------------------------------------
        // A simple container for your genome data. Adapt as needed.
        this.network = {
            genomePool: {},  // e.g., { "genomeName" : { anyDataYouLike } }
        };
    }

    // =========================================================================
    // 1. MEMORY METHODS
    // =========================================================================

    /**
     * Convert (xx, yy, zz) into a string key: "xx,yy,zz".
     */
    generateAddress(xx, yy, zz) {
        return `${xx},${yy},${zz}`;
    }

    /**
     * Find an existing node by 3D coordinates. Returns undefined if missing.
     */
    findNode(xx, yy, zz) {
        return this.nodesMap.get(this.generateAddress(xx, yy, zz));
    }

    /**
     * Create a node if it doesn't already exist, return it.
     */
    createNodeIfNeeded(xx, yy, zz, rows = 0, cols = 0) {
        const addressKey = this.generateAddress(xx, yy, zz);
        let node = this.nodesMap.get(addressKey);

        if (!node) {
            node = {
                xx,
                yy,
                zz,
                value: Array.from({ length: rows }, () => Array(cols).fill(0)),
            };
            this.nodesMap.set(addressKey, node);
            this.usedAddresses.add(addressKey);
        }
        return node;
    }

    /**
     * Retrieve the entire 2D array at (xx, yy, zz).
     */
    getAllData(xx, yy, zz) {
        const node = this.findNode(xx, yy, zz);
        if (!node) {
            throw new Error(`Node at (${xx}, ${yy}, ${zz}) not found.`);
        }
        return node.value;
    }

    /**
     * Retrieve a single cell from (xx, yy, zz, rowIndex, colIndex).
     */
    get(xx, yy, zz, rowIndex, colIndex) {
        const node = this.findNode(xx, yy, zz);
        if (!node) {
            throw new Error(`Node at (${xx}, ${yy}, ${zz}) not found.`);
        }
        if (
            rowIndex >= 0 && rowIndex < node.value.length &&
            colIndex >= 0 && colIndex < node.value[rowIndex].length
        ) {
            return node.value[rowIndex][colIndex];
        } else {
            throw new Error("Index out of bounds");
        }
    }

    /**
     * Overwrite the node’s entire 2D array at (xx, yy, zz).
     */
    setMatrix(xx, yy, zz, matrix) {
        const rows = matrix.length;
        const cols = rows > 0 ? matrix[0].length : 0;

        const node = this.createNodeIfNeeded(xx, yy, zz, rows, cols);
        node.value = matrix;
    }

    /**
     * Set a single cell at (xx, yy, zz, rowIndex, colIndex).
     * Auto-expands matrix if needed.
     */
    set(xx, yy, zz, rowIndex, colIndex, newValue) {
        let node = this.findNode(xx, yy, zz);
        if (!node) {
            node = this.createNodeIfNeeded(xx, yy, zz, rowIndex + 1, colIndex + 1);
        }
        this.expandMatrixIfNeeded(node, rowIndex, colIndex);
        node.value[rowIndex][colIndex] = newValue;
    }

    /**
     * Ensure node.value can accommodate rowIndex, colIndex.
     */
    expandMatrixIfNeeded(node, rowIndex, colIndex) {
        const currentRows = node.value.length;
        const currentCols = currentRows > 0 ? node.value[0].length : 0;

        // Expand rows if needed
        while (node.value.length <= rowIndex) {
            node.value.push(Array(currentCols).fill(0));
        }
        // Re-check columns after any new rows
        const updatedCols = node.value[0].length;
        // Expand columns if needed
        if (colIndex >= updatedCols) {
            for (let r = 0; r < node.value.length; r++) {
                while (node.value[r].length <= colIndex) {
                    node.value[r].push(0);
                }
            }
        }
    }

    /**
     * Returns [numRows, numCols] of the node’s 2D array at (xx, yy, zz).
     */
    getDimensions(xx, yy, zz) {
        const node = this.findNode(xx, yy, zz);
        if (!node) {
            return [0, 0];
        }
        const rows = node.value.length;
        const cols = rows > 0 ? node.value[0].length : 0;
        return [rows, cols];
    }

    /**
     * Example "update" function. Replace with your own logic (e.g. gating).
     */
    update() {
        for (const node of this.nodesMap.values()) {
            // Example: set every cell to 1
            for (let r = 0; r < node.value.length; r++) {
                for (let c = 0; c < node.value[r].length; c++) {
                    node.value[r][c] = 1;
                }
            }
        }
    }

    // =========================================================================
    // 2. I/O MAPPER
    // =========================================================================

    /**
     * Register an input with a given name.  
     * It gets the next free address. Optionally specify rows/cols/meta.
     */
    registerInput(name, rows = 1, cols = 1, meta = {}) {
        const { xx, yy, zz } = this.findNextAvailableAddress();
        this.createNodeIfNeeded(xx, yy, zz, rows, cols);

        this.inputs.set(name, {
            xx, yy, zz, rows, cols, meta
        });
        return { xx, yy, zz };
    }

    /**
     * Register an output with a given name.
     * Also gets the next free address (rows, cols, meta optional).
     */
    registerOutput(name, rows = 1, cols = 1, meta = {}) {
        const { xx, yy, zz } = this.findNextAvailableAddress();
        this.createNodeIfNeeded(xx, yy, zz, rows, cols);

        this.outputs.set(name, {
            xx, yy, zz, rows, cols, meta
        });
        return { xx, yy, zz };
    }

    /**
     * Get the {xx, yy, zz} address for a registered input.
     */
    getInputAddress(name) {
        return this.inputs.get(name) ?? null;
    }

    /**
     * Get the {xx, yy, zz} address for a registered output.
     */
    getOutputAddress(name) {
        return this.outputs.get(name) ?? null;
    }

    /**
     * Find a "next available" address in naive linear fashion.
     * If it's already used, increment and check again.
     */
    findNextAvailableAddress() {
        while (true) {
            const addressStr = this.generateAddress(this.nextXX, this.nextYY, this.nextZZ);
            if (!this.usedAddresses.has(addressStr)) {
                this.usedAddresses.add(addressStr);
                const result = {
                    xx: this.nextXX,
                    yy: this.nextYY,
                    zz: this.nextZZ,
                };
                this.incrementAddress();
                return result;
            } else {
                this.incrementAddress();
            }
        }
    }

    /**
     * Increment the (xx, yy, zz) pointer for next free address.
     * Simple linear stepping. Adjust as needed for your 3D space or partitioning.
     */
    incrementAddress() {
        this.nextXX++;
        if (this.nextXX >= 1000) {
            this.nextXX = 0;
            this.nextYY++;
        }
        if (this.nextYY >= 1000) {
            this.nextYY = 0;
            this.nextZZ++;
        }
        // Potential logic for handling overflow, if needed
    }

    // =========================================================================
    // 3. NETWORK (Genome Pool)
    // =========================================================================

    /**
     * Basic methods to manage the genome pool.
     * Customize these to fit your actual multi-genome structure.
     */

    addGenome(name, data) {
        // e.g. data could be an object with neural net weights, ID, parents, etc.
        this.network.genomePool[name] = data;
    }

    getGenome(name) {
        return this.network.genomePool[name] || null;
    }

    removeGenome(name) {
        delete this.network.genomePool[name];
    }

    listGenomes() {
        return Object.keys(this.network.genomePool);
    }

    // =========================================================================
    // 4. SERIALIZATION & DESERIALIZATION
    // =========================================================================

    /**
     * Convert everything into a plain JS object for JSON.stringify().
     * This includes:
     *   - All memory nodes
     *   - usedAddresses
     *   - inputs/outputs
     *   - nextXX, nextYY, nextZZ
     *   - network (genomePool, etc.)
     */
    toJSON() {
        // Convert each node into a serializable object
        const nodes = [];
        for (const node of this.nodesMap.values()) {
            // node = { xx, yy, zz, value: [...2D array...] }
            nodes.push({
                xx: node.xx,
                yy: node.yy,
                zz: node.zz,
                value: node.value,
            });
        }

        // Convert maps (inputs & outputs) to arrays for easy serialization
        const inputsArray = [];
        for (const [name, info] of this.inputs.entries()) {
            inputsArray.push([name, info]);
        }
        const outputsArray = [];
        for (const [name, info] of this.outputs.entries()) {
            outputsArray.push([name, info]);
        }

        // Return everything
        return {
            nodes,
            usedAddresses: Array.from(this.usedAddresses),
            inputs: inputsArray,
            outputs: outputsArray,

            nextXX: this.nextXX,
            nextYY: this.nextYY,
            nextZZ: this.nextZZ,

            // Include the entire network object, e.g. { genomePool: ... }
            network: this.network,
        };
    }

    /**
     * Rebuild the entire Crown state from a previously saved JSON object.
     * This overwrites existing data in memory, I/O maps, and the network.
     */
    fromJSON(serialized) {
        // 1. Clear existing memory data
        this.nodesMap.clear();
        this.usedAddresses.clear();
        this.inputs.clear();
        this.outputs.clear();

        // 2. Restore memory nodes
        if (Array.isArray(serialized.nodes)) {
            for (const n of serialized.nodes) {
                const key = this.generateAddress(n.xx, n.yy, n.zz);
                this.nodesMap.set(key, {
                    xx: n.xx,
                    yy: n.yy,
                    zz: n.zz,
                    value: n.value,
                });
            }
        }

        // 3. Restore usedAddresses
        if (Array.isArray(serialized.usedAddresses)) {
            for (const addr of serialized.usedAddresses) {
                this.usedAddresses.add(addr);
            }
        }

        // 4. Restore inputs
        if (Array.isArray(serialized.inputs)) {
            for (const [name, info] of serialized.inputs) {
                this.inputs.set(name, info);
            }
        }

        // 5. Restore outputs
        if (Array.isArray(serialized.outputs)) {
            for (const [name, info] of serialized.outputs) {
                this.outputs.set(name, info);
            }
        }

        // 6. Restore address pointers
        this.nextXX = serialized.nextXX ?? 0;
        this.nextYY = serialized.nextYY ?? 0;
        this.nextZZ = serialized.nextZZ ?? 0;

        // 7. Restore the network (genome pool, etc.)
        //    If not present, default to empty
        this.network = serialized.network || { genomePool: {} };
    }
}
