import os

files = {
    'src/app/(store)/checkout/page.tsx': [
        ("\% : \$}", "\% : $\}"),
        ("\", "\"),
        ("\", "\"),
        ("\", "\")
    ],
    'src/app/(store)/invoice/[id]/page.tsx': [
        ("{w-8 h-8  + ", "{\"w-8 h-8 \" + ")
    ],
    'src/app/(store)/product/[slug]/page.tsx': [
        ("{w-5 h-5  + ", "{\"w-5 h-5 \" + "),
        ("{w-4 h-4  + ", "{\"w-4 h-4 \" + "),
        ("\", "\")
    ],
    'src/app/api/invoices/[id]/simulate-payment/route.ts': [
        ("allDeliveredContent.push(Product:  + product.name + \\n + deliveredContent);",
         "allDeliveredContent.push(\"Product: \" + product.name + \"\\n\" + deliveredContent);")
    ]
}

for path, replacements in files.items():
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    for old, new in replacements:
        content = content.replace(old, new)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
