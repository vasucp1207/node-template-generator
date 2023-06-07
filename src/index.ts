const fs = require('fs');
const path = require('path');
const inquirer = require('inquirer');
const chalk = require('chalk');
const shell = require('shell');
const yargs = require('yargs');

// array of templates
const CHOICES = fs.readdirSync(path.join(__dirname, 'templates'));

interface cliOptions {
  projectName: string;
  templateName: string;
  templatePath: string;
  targetPath: string;
}

const CURR_DIR = process.cwd();

const QUESTIONS = [
  {
    name: 'template',
    type: 'list',
    message: 'What project template would you like to generate?',
    choices: CHOICES,
    when: () => !yargs.argv['template']
  },
  {
    name: 'name',
    type: 'input',
    message: 'Project name:',
    when: () => !yargs.argv['name']
  }
];

inquirer
  .prompt(QUESTIONS)
  .then((answers: any) => {
    // merge command line arguments with user’s answers
    answers = Object.assign({}, answers, yargs.argv);
    const porjectChoice = answers['template'];
    const projectName = answers['name'];

    // read files from this path to target
    const templatePath = path.join(__dirname, 'templates', porjectChoice);
    // inside the root of the project
    const targetPath = path.join(CURR_DIR, projectName);

    if (!createProject(targetPath)) {
      return;
    }

    const options: cliOptions = {
      projectName,
      templateName: porjectChoice,
      templatePath,
      targetPath
    }

    createDirContents(templatePath, projectName);
    postProcess(options);

    console.log(options);
  });

function createProject(projectPath: string) {
  // if the target path already exists
  if (fs.existsSync(projectPath)) {
    console.log(chalk.white.bgRed.bold(`Folder ${projectPath} exists. Delete or use another name.`));
    return false;
  }
  fs.mkdirSync(projectPath);
  return true;
}

const SKIP_FILES = ['node_modules', '.gitignore'];
function createDirContents(
  templatePath: string,
  projectName: string
) {
  // read all files and files from level-1 from template folder
  const filesToCreate = fs.readdirSync(templatePath);

  filesToCreate.forEach((file: any) => {
    const originalFilePath = path.join(templatePath, file);
    const stats = fs.statSync(originalFilePath);

    if (SKIP_FILES.indexOf(file) > -1) return;

    if (stats.isFile()) {
      // read file contents
      let contents = fs.readFileSync(originalFilePath, 'utf8');
      // write the file contents
      const writePath = path.join(CURR_DIR, projectName, file);
      fs.writeFileSync(writePath, contents, 'utf8');
    } else if (stats.isDirectory()) {
      fs.mkdirSync(path.join(CURR_DIR, projectName, file));
      createDirContents(path.join(templatePath, file), path.join(projectName, file));
    }
  })
}

function postProcess(options: cliOptions) {
  const isNode = fs.existsSync(path.join(options.templatePath, 'package.json'));
  if(isNode) {
    shell.cd(options.targetPath);
    const res = shell.exec('yarn install');
    if(res.code !== 0) return false;
  }
  return true;
}