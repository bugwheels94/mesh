## Multi Repo Manager

Mesh provides many useful commands to simplify a developer's day to day life while working on node/npm for multi repos (just like mono repos but each repo is allowed to be a new repo).

1. Have you ever got tired of adding commitizen OR semantic-release OR prettier to many repos while boilerplating?
2. Did you ever wanted to have linked one package to another and get realtime changes in each repo?
3. Is it hard to run same command on many repos at once?

## Installation

    npm install -g @lytejs/mesh

## Prerequisites

Mesh recommends that you already use [npm workspaces](https://docs.npmjs.com/cli/v8/using-npm/workspaces/) in your project for npm related things. Also, **mesh requires a package.json file** in the root of all of your repos, which is already present in case you use npm workspace.

## Steps

### Step 1

From the folder in which your root package.json is created, run a command `mesh projects add-folder`. This command will ask few questions and will create a setting in the package.json. When asked about group, you can think that a group is a project. So, ig you are working in a big project called `babel` then your group name will be babel. And folder name is like your repo name.

### Step 2

After you run the Step1 command for all of the folders(repos) that you wanna add then you can start using mesh commands like

    mesh -g GROUP_NAME git add . # this command will run git add . in all of your repos.
    mesh -g GROUP_NAME git commit # this command will run git add . in all of your repos.

    mesh -g GROUP_NAME add commitizen # adds commitizen to your repo in SINGLE command.
    mesh -g GROUP_NAME add semantic-release # adds semantic-release to your repo in SINGLE command.
    mesh -g GROUP_NAME add prettier # adds prettier to your repo in SINGLE command

If all of your repos have same npm command, lets say `start:watch` then you can run `mesh -g GROUP_NAME npm run start:watch`

Based on the same above concept, you can use github's gh like `mesh -g GROUP_NAME gh pr create`

**Note:** If you dont wanna mention `-g GROUP_NAME` then you can also do `mesh set -g GROUP_NAME` and then omit writing `-g` everytime
