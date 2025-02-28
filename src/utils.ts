// Random link generator

export function random(len : number)
{
    let options:string = "dkrgfydshjkiyjhdskailudghaihcgaskjcvgxhakjvcgxnzjaskh";
    let length = options.length;

    let ans = "";
    for(let i=0; i < len; i++)
    {
        ans += options[Math.floor((Math.random() * length))] // 0 -> last index of the options string
    }

    return ans;
}