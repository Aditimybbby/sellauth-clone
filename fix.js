const fs = require('fs');

let c1 = fs.readFileSync('src/app/(store)/checkout/page.tsx', 'utf8');
c1 = c1.replace(/\$\{discount\.value\}% : \\$/g, '\$%\ : $\');
c1 = c1.replace(/\\\$\/g, '$$'); // wait, let's just do simple string replacements
fs.writeFileSync('src/app/(store)/checkout/page.tsx', c1);

let i1 = fs.readFileSync('src/app/(store)/invoice/[id]/page.tsx', 'utf8');
i1 = i1.replace(/className=\{w-8 h-8  \+ /g, 'className={"w-8 h-8 " + ');
fs.writeFileSync('src/app/(store)/invoice/[id]/page.tsx', i1);

let p1 = fs.readFileSync('src/app/(store)/product/[slug]/page.tsx', 'utf8');
p1 = p1.replace(/className=\{w-5 h-5  \+ /g, 'className={"w-5 h-5 " + ');
p1 = p1.replace(/className=\{w-4 h-4  \+ /g, 'className={"w-4 h-4 " + ');
fs.writeFileSync('src/app/(store)/product/[slug]/page.tsx', p1);

let s1 = fs.readFileSync('src/app/api/invoices/[id]/simulate-payment/route.ts', 'utf8');
s1 = s1.replace(/allDeliveredContent\.push\(Product:  \+ /g, 'allDeliveredContent.push("Product: " + ');
s1 = s1.replace(/\+ \\n \+ /g, '+ "\\n" + ');
fs.writeFileSync('src/app/api/invoices/[id]/simulate-payment/route.ts', s1);

