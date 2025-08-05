#!/bin/bash

# Performance benchmark runner script for decopin-cli
# This script runs performance benchmarks before and after optimization

set -e

echo "🚀 Decopin CLI Performance Benchmark Runner"
echo "=============================================="

# Check if required dependencies are available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not installed."
    exit 1
fi

if ! command -v bun &> /dev/null; then
    echo "❌ Bun is required but not installed."
    exit 1
fi

# Configuration
APP_DIR="./app"
DIST_DIR="./dist"
BENCHMARK_SCRIPT="./scripts/performance-benchmark.ts"
RESULTS_DIR="./benchmark-results"

# Create results directory
mkdir -p "$RESULTS_DIR"

# Function to run benchmark
run_benchmark() {
    local label="$1"
    local output_file="$2"

    echo "📊 Running benchmark: $label"

    if [ ! -f "$DIST_DIR/cli.js" ]; then
        echo "⚠️  CLI not built. Building now..."
        bun run build
    fi

    # Run the benchmark
    bunx tsx "$BENCHMARK_SCRIPT" "$output_file" || {
        echo "❌ Benchmark failed for $label"
        return 1
    }

    echo "✅ Benchmark completed: $label"
    echo "   Results saved to: $output_file"
}

# Function to compare benchmarks
compare_benchmarks() {
    local before_file="$1"
    local after_file="$2"
    local comparison_file="$3"

    echo "📈 Comparing benchmarks..."

    bunx tsx "$BENCHMARK_SCRIPT" --compare --before "$before_file" --after "$after_file" || {
        echo "❌ Benchmark comparison failed"
        return 1
    }

    echo "✅ Comparison completed"
    echo "   Results saved to: $comparison_file"
}

# Parse command line arguments
case "${1:-help}" in
    "before")
        echo "Running baseline benchmark (before optimization)..."
        run_benchmark "Before Optimization" "$RESULTS_DIR/benchmark-before.json"
        ;;

    "after")
        echo "Running optimized benchmark (after optimization)..."
        run_benchmark "After Optimization" "$RESULTS_DIR/benchmark-after.json"
        ;;

    "compare")
        if [ ! -f "$RESULTS_DIR/benchmark-before.json" ] || [ ! -f "$RESULTS_DIR/benchmark-after.json" ]; then
            echo "❌ Both before and after benchmark files are required for comparison."
            echo "   Run './benchmark.sh before' and './benchmark.sh after' first."
            exit 1
        fi

        compare_benchmarks \
            "$RESULTS_DIR/benchmark-before.json" \
            "$RESULTS_DIR/benchmark-after.json" \
            "$RESULTS_DIR/benchmark-comparison.json"
        ;;

    "full")
        echo "Running full benchmark suite..."

        echo "🔄 Step 1: Building current version..."
        bun run build

        echo "🔄 Step 2: Running baseline benchmark..."
        run_benchmark "Before Optimization" "$RESULTS_DIR/benchmark-before.json"

        echo "🔄 Step 3: Applying optimizations..."
        # Here you would typically switch to optimized code
        echo "   Note: Apply optimizations manually and run './benchmark.sh after'"

        ;;

    "clean")
        echo "🧹 Cleaning benchmark results..."
        rm -rf "$RESULTS_DIR"
        echo "✅ Benchmark results cleaned"
        ;;

    "list")
        echo "📋 Available benchmark results:"
        if [ -d "$RESULTS_DIR" ]; then
            ls -la "$RESULTS_DIR"/*.json 2>/dev/null || echo "   No benchmark results found"
        else
            echo "   No results directory found"
        fi
        ;;

    "help"|*)
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  before      Run baseline benchmark (before optimization)"
        echo "  after       Run optimized benchmark (after optimization)"
        echo "  compare     Compare before and after benchmarks"
        echo "  full        Run full benchmark suite"
        echo "  clean       Clean benchmark results"
        echo "  list        List available benchmark results"
        echo "  help        Show this help message"
        echo ""
        echo "Examples:"
        echo "  $0 before           # Run baseline benchmark"
        echo "  $0 after            # Run optimized benchmark"
        echo "  $0 compare          # Compare results"
        echo "  $0 full             # Run complete benchmark suite"
        ;;
esac

echo ""
echo "📊 Benchmark runner completed"
