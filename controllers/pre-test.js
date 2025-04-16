/**
 * author: joseph.kwarteng@open.ac.uk
 * created on: 21-02-2025-13h-56m
 * github: https://github.com/kwartengj
 * copyright 2025
*/

import { kmeans } from 'ml-kmeans';
import { setAllDbsStrategy } from '../ragInitializer.js'; // to use allDBs for the vectorDB

// function to calculate relevance statistics
function calculateRelevanceStatistics(relevanceScores) {
    const min = Math.min(...relevanceScores);
    const max = Math.max(...relevanceScores);
    const range = max - min;

    const mean = relevanceScores.reduce((sum, val) => sum + val, 0) / relevanceScores.length;
    const variance = relevanceScores.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / relevanceScores.length;

    return {
        range,
        variance,
        distribution: {
            min,
            max,
            mean,
            median: calculateMedian(relevanceScores),
            standardDeviation: Math.sqrt(variance)
        }
    };
}

// function to calculate the median
function calculateMedian(values) {
    values.sort((a, b) => a - b);
    const mid = Math.floor(values.length / 2);
    return values.length % 2 !== 0 ? values[mid] : (values[mid - 1] + values[mid]) / 2;
}

function identifyRelevanceClusters(relevanceScores, numClusters = 2) {
    const data = relevanceScores.map(score => [score]); // Convert to 2D array for k-means
    const result = kmeans(data, numClusters);

    return {
        clusters: result.centroids.map((centroid, index) => ({
            centroid: centroid[0], // Centroid value for this cluster
            points: relevanceScores.filter((_, i) => result.clusters[i] === index) // Points belonging to the cluster
        }))
    };
}

// function to compare results of different strategies
function compareResults(results) {
    const comparisons = [];
    const comparedPairs = new Set(); // Track compared strategy pairs for each question

    for (let i = 0; i < results.length; i++) {
        for (let j = i + 1; j < results.length; j++) {
            const resultA = results[i];
            const resultB = results[j];

            // Skip if the strategies are identical
            if (resultA.strategy === resultB.strategy) continue;

            // Create a unique key for comparison (ensuring order consistency)
            const comparisonKey = `${resultA.question}|${resultA.strategy}|${resultB.strategy}`;
            const reverseKey = `${resultA.question}|${resultB.strategy}|${resultA.strategy}`;

            if (comparedPairs.has(comparisonKey) || comparedPairs.has(reverseKey)) {
                continue; // Skip duplicate comparisons
            }

            // Mark this pair as compared
            comparedPairs.add(comparisonKey);

            // Find common chunks
            const commonChunks = resultA.selectedChunks.filter(chunkA =>
                resultB.selectedChunks.some(chunkB => chunkB.metadata.id === chunkA.metadata.id)
            );

            // Find unique chunks for each strategy
            const uniqueChunksA = resultA.selectedChunks.filter(chunkA =>
                !resultB.selectedChunks.some(chunkB => chunkB.metadata.id === chunkA.metadata.id)
            );

            const uniqueChunksB = resultB.selectedChunks.filter(chunkB =>
                !resultA.selectedChunks.some(chunkA => chunkA.metadata.id === chunkB.metadata.id)
            );

            // Compare positions of common chunks
            const commonChunkPositions = commonChunks.map(chunk => ({
                chunkId: chunk.metadata.id,
                positionInA: resultA.selectedChunks.findIndex(c => c.metadata.id === chunk.metadata.id),
                positionInB: resultB.selectedChunks.findIndex(c => c.metadata.id === chunk.metadata.id)
            }));

            comparisons.push({
                question: resultA.question,
                strategyA: resultA.strategy,
                strategyB: resultB.strategy,
                commonChunks,
                uniqueChunksA,
                uniqueChunksB,
                commonChunkPositions
            });
        }
    }

    return comparisons;
}

// function to get chunks from multi-sources
async function getChunks(question, ragApplication, strategy, rValue, kValue) {
    // we have multiple sources we are getting chunks from
    setAllDbsStrategy(strategy, rValue, kValue); // Set the strategy for the vectorDB
    const chunks = await ragApplication.getContext(question);

    switch (strategy) {
        case 'weightedRelevance':
            if (chunks.length > 0) {
                // const scores = chunks.map(chunk => chunk.weightedRelevance);
                // // remove duplicates scores * thus to stick to just a source and a score 
                // const uniqueScores = [...new Set(scores)];
                // const relevanceStats = calculateRelevanceStatistics(uniqueScores);
                // const relevanceClusters = identifyRelevanceClusters(uniqueScores);

                return {
                    question,
                    strategy,
                    rValue,
                    kValue,
                    selectedChunks: chunks
                    // relevanceStats,
                    // relevanceClusters
                };
            }

        case 'topicClassification':
            return {
                question,
                strategy,
                rValue,
                kValue,
                selectedChunks: chunks,
                topicRelevanceScore: chunks.map(chunk => chunk.topicRelevance)
            }
        default:
            return {
                question,
                strategy,
                rValue,
                kValue,
                selectedChunks: chunks,
            };
    }
    // return chunks;
}


// Pre-test route handler
async function runPreTest(req, res) {
    try {
        const { questions, strategies, kValues, rValues, sender } = req.body;
        const conversationId = req.params.conversationId;
        const ragApplication = req.ragApplication;

        if (!ragApplication) {
            throw new Error('RAG Application is not initialized');
        }

        if (!sender || sender !== 'HUMAN' || !questions) {
            return res.status(400).json({ error: 'Invalid message format. Must include sender "HUMAN" and message.' });
        }

        const results = [];

        for (const question of questions) {
            for (const strategy of strategies) {
                for (const kValue of kValues) {
                    for (const rValue of rValues) {
                        const result = await getChunks(question, ragApplication, strategy, rValue, kValue);
                        results.push(result);
                    }
                }
            }
        }

        if (strategies.length > 1) {
            // Compare the results of different strategies
            const comparisons = compareResults(results);
            return res.status(200).json({ results, comparisons});

        }
        res.status(200).json({ results});
    } catch (error) {
        res.status(500).json({ error: error.questions });
    }
}

// Export the new pre-test function
export { runPreTest };