# **MapleI**

This package can download the user avatar image of the game MapleStory.

## Get started

First install maplei:

```sh
npm install -g maplei
```

## Usage

```
maplei <option>
```

|   option   |  description  | default | choices | required |
| :--------: | :-----------: | :-----: | :-----: | :------: |
| -n, --nick | user nickname |    -    |    -    |    🟢    |
| -p, --path | download path |   cwd   |    -    |    🔴    |

<br />

```js
// example
maplei -n 타락파워전사 -p Users/<username>/Desktop
```
