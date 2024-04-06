import fs from "fs";
import { glob } from "glob";
import path from "path";
import readlineSync from "readline-sync";
import sharp from "sharp";

// Function to recursively find all image files in a directory
async function findImages(dir) {
  let directory = "";
  if (!fs.existsSync(dir)) {
    directory = dir + "/";
  }
  const files = await glob(`${directory}**/*.{jpg,jpeg,png,gif}`, {
    ignore: "**/node_modules/**",
  });

  return files;
}

// Function to optimize an image and return the path of the optimized image if successful
async function optimizeImage(filePath, desiredFormat, targetSize = 100000) {
  try {
    let image = sharp(filePath);
    let metadata = await image.metadata();

    // Generate a unique name for the optimized file to avoid conflicts
    let format = desiredFormat || metadata.format;
    let outputFilePath = filePath.replace(
      path.extname(filePath),
      `-optimized.${format}`
    );

    let quality = 100;
    let optimized = false;

    while (!optimized && quality > 0) {
      let buffer = await image.toFormat(format, { quality }).toBuffer();
      if (buffer.length <= targetSize) {
        await fs.promises.writeFile(outputFilePath, buffer);
        console.log(
          `Optimized ${filePath} to ${
            buffer.length / 1024
          } KB at quality ${quality}`
        );
        optimized = true;
        return outputFilePath; // Return the path of the optimized image
      } else {
        quality -= 5; // Decrease quality by 5% and try again
      }
    }

    if (!optimized) {
      console.log(
        `Could not optimize ${filePath} to be under ${targetSize / 1024} KB.`
      );

      await fs.promises.writeFile(outputFilePath, buffer);
      return outputFilePath;
    }
  } catch (error) {
    console.error(`Error optimizing ${filePath}:`, error);
  }
  return null; // Return null if optimization failed or encountered an error
}

// Main function to run the optimization process and delete optimized images afterward
async function runOptimization(dir) {
  const desiredFormat = readlineSync.question(
    "Enter desired format (jpg, png, gif) or press enter to keep original: "
  );

  let optimizedFiles = []; // Track paths of optimized files

  try {
    const files = await findImages(dir);
    const totalFiles = files.length;

    for (let filePath of files) {
      const outputFilePath = await optimizeImage(filePath, desiredFormat);
      if (outputFilePath) {
        optimizedFiles.push(outputFilePath); // Collect optimized file paths
      }
    }

    console.log(
      `Optimization complete. Total files: ${totalFiles}, Optimized: ${optimizedFiles.length}`
    );

    // // Delete all optimized files
    // for (let filePath of optimizedFiles) {
    //   await fs.promises.unlink(filePath);
    //   console.log(`Deleted optimized file: ${filePath}`);
    // }
  } catch (error) {
    console.error("Error processing images:", error);
  }
}

// User input for directory path
const dir = readlineSync.question(
  "Enter the path to the directory with images: "
);
const absoluteDir = path.resolve(dir); // Resolve to an absolute path to ensure correct handling
runOptimization(absoluteDir);
