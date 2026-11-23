"""Regenerate all downloadable sheets from site/catalog.js with ReportLab."""
import json
from pathlib import Path
from urllib.parse import unquote
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import (
    Image, KeepTogether, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
)

ROOT = Path(__file__).resolve().parents[1]
RED = colors.HexColor('#bf1627')
INK = colors.HexColor('#191a1c')
GRAY = colors.HexColor('#5b5d61')
LIGHT = colors.HexColor('#f5f4f1')
styles = {
    'title': ParagraphStyle('title', fontName='Helvetica-Bold', fontSize=29, leading=33, textColor=INK),
    'heading': ParagraphStyle('heading', fontName='Helvetica-Bold', fontSize=12, leading=16, textColor=RED),
    'body': ParagraphStyle('body', fontSize=10, leading=14, textColor=INK),
    'cell': ParagraphStyle('cell', fontSize=9, leading=12, textColor=INK),
    'label': ParagraphStyle('label', fontName='Helvetica-Bold', fontSize=9, leading=12, textColor=INK),
    'note': ParagraphStyle('note', fontSize=8, leading=11, textColor=GRAY),
}

def para(value, style):
    return Paragraph(escape(value), styles[style])

def page(canvas, document):
    width, height = A4
    canvas.setFillColor(RED)
    canvas.rect(0, height - 7, width, 7, stroke=0, fill=1)
    canvas.setFillColor(INK)
    canvas.setFont('Helvetica-Bold', 12)
    canvas.drawString(36, height - 32, 'RV POWER')
    canvas.setFont('Helvetica', 9)
    canvas.drawRightString(width - 36, height - 32, 'TECHNICAL SPECIFICATIONS')
    canvas.setStrokeColor(LIGHT)
    canvas.line(36, 39, width - 36, 39)
    canvas.setFillColor(GRAY)
    canvas.setFont('Helvetica', 8)
    canvas.drawString(36, 25, 'RV Power | Bengaluru | +91 94481 69379 | info@rv-power.in')
    canvas.drawRightString(width - 36, 25, str(document.page))

def build(model):
    destination = ROOT / 'specs' / f'honda-{model["id"]}.pdf'
    title = f"{model.get('brand', 'Honda')} {model['name']}"
    doc = SimpleDocTemplate(str(destination), pagesize=A4, topMargin=55, bottomMargin=52,
                            leftMargin=36, rightMargin=36, title=f'{title} Specifications',
                            author='RV Power')
    photo = Image(str(ROOT / unquote(model['image'])), width=112, height=100, kind='proportional')
    intro = [para(model['category'].upper(), 'heading'), Spacer(1, 4),
             para(title, 'title'), Spacer(1, 7),
             para(model['highlight'], 'label'), Spacer(1, 6), para(model['description'], 'body')]
    lead = Table([[intro, photo]], colWidths=[380, 131], style=[('VALIGN', (0, 0), (-1, -1), 'MIDDLE')])
    story = [lead, Spacer(1, 12)]
    for section in model['sections']:
        rows = [[para(label, 'label'), para(value, 'cell')] for label, value in section['rows']]
        heading = para(section['title'], 'heading')
        table = Table([[heading, ''], *rows], colWidths=[239, 272], repeatRows=1)
        table.setStyle(TableStyle([
            ('SPAN', (0, 0), (-1, 0)), ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [LIGHT, colors.white]),
            ('TOPPADDING', (0, 1), (-1, -1), 3), ('BOTTOMPADDING', (0, 1), (-1, -1), 3)
        ]))
        story.extend([table, Spacer(1, 11)])
    if model.get('limitedSpecifications'):
        story.extend([para('Honda publishes compatibility and feature details for this accessory.', 'note'), Spacer(1, 6)])
    source = escape(model['source'])
    story.append(KeepTogether([
        Paragraph(f'Source: <link href="{source}" color="#a81223">Honda India product listing</link>', styles['note']),
        para('Confirm the equipment variant and current availability with RV Power.', 'note'),
    ]))
    doc.build(story, onFirstPage=page, onLaterPages=page)

if __name__ == '__main__':
    (ROOT / 'specs').mkdir(exist_ok=True)
    module = (ROOT / 'site/catalog.js').read_text()
    for product in json.loads(module.removeprefix('export default ').strip().removesuffix(';')):
        build(product)
