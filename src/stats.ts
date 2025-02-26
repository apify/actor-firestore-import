type Stats = {
    /** Number of documents that were imported (=firestore documents created or updated) */
    imported: number,
    /** Number of documents that failed to import (=firestore documents where creation/update failed) */
    failed: number,
    /** Number of documents that were skipped (=firestore documents where write was skipped) */
    skipped: number,
    /** Number of documents that were overwritten (=firestore documents that were overwritten) */
    overwritten: number,
    /** Number of documents that were merged (=firestore documents that were merge updated) */
    merged: number,
    /** Number of documents that were created (=firestore documents that were newly created) */
    created: number,
    /** Number of dataset items that were processed */
    itemsProcessed: number,
    /** Number of dataset items that were processed but import of its documents failed */
    itemsFailed: number,
}

export type StatsResult = Stats & {
    /** Execution time in milliseconds */
    executionTimeMs: number,
    /** Start time of the import */
    startTime: Date,
    /** End time of the import */
    endTime: Date,
}

export class FirestoreImportStatistics {
    /** Execution time in milliseconds */
    private executionTimeMs: number = 0;
    /** Start time of the import */
    private readonly startTime: Date;
    /** End time of the import */
    private endTime: Date | null = null;

    /** Collected statistics */
    private readonly stats: Stats;

    /** Parent statistics */
    private readonly parent?: FirestoreImportStatistics;

    private batchWritten: boolean = false;

    /** Initialize statistics */
    public static init() {
        return new FirestoreImportStatistics();
    }

    public getStats(): StatsResult {
        if (!this.endTime) {
            this.endTime = new Date();
        }
        this.executionTimeMs = this.endTime.getTime() - this.startTime.getTime();
        return {
            ...this.stats,
            executionTimeMs: this.executionTimeMs,
            startTime: this.startTime,
            endTime: this.endTime,
        };
    }

    /**
     * Open new batch statistics
     */
    public openBatch() {
        if (this.parent) {
            throw new Error('Cannot open batch on batch statistics');
        }
        return new FirestoreImportStatistics(this);
    }

    public writeBatch() {
        if (!this.parent) {
            throw new Error('Cannot write batch on main statistics');
        }
        if (this.batchWritten) {
            throw new Error('Batch already written, open new batch');
        }
        this.batchWritten = true;
        this.parent.addStats({
            ...this.stats,
            failed: 0,
            itemsFailed: 0,
        });
    }

    public failBatch() {
        if (!this.parent) {
            throw new Error('Cannot write batch on main statistics');
        }
        if (this.batchWritten) {
            throw new Error('Batch already written, open new batch');
        }
        this.batchWritten = true;
        this.parent.addStats({
            ...this.stats,
            itemsFailed: this.stats.itemsProcessed,
            failed: this.stats.imported,
            imported: 0,
        });
    }

    public inc(type: 'skipped' | 'overwritten' | 'merged' | 'created' | 'itemsProcessed') {
        this.stats[type]++;
        if (type !== 'itemsProcessed') {
            this.stats.imported++;
        }
    }

    private constructor(parent?: FirestoreImportStatistics) {
        this.parent = parent;
        this.startTime = new Date();
        this.stats = {
            imported: 0,
            skipped: 0,
            overwritten: 0,
            merged: 0,
            created: 0,
            failed: 0,
            itemsProcessed: 0,
            itemsFailed: 0,
        }
    }

    private addStats(stats: Stats) {
        this.stats.imported += stats.imported;
        this.stats.skipped += stats.skipped;
        this.stats.overwritten += stats.overwritten;
        this.stats.merged += stats.merged;
        this.stats.failed += stats.failed;
        this.stats.itemsProcessed += stats.itemsProcessed;
        this.stats.itemsFailed += stats.itemsFailed;
        this.endTime = new Date();
    }
}
