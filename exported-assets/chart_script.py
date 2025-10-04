import plotly.graph_objects as go

# Data from the provided JSON
weather_conditions = ["Rain","Heavy Rain","Very Hot","Very Cold","High Wind","High Humidity","Uncomfortable Conditions"]
probabilities = [30,0,0,0,20,30,30]
risk_levels = ["High","Low","Low","Low","Moderate","High","High"]

# Define color mapping for risk levels
color_map = {
    "Low": "#2E8B57",      # Green for 0-15% (Low Risk)
    "Moderate": "#D2BA4C",  # Yellow for 15-30% (Moderate Risk) 
    "High": "#DB4545"       # Red for 30%+ (High Risk)
}

# Map colors to each bar based on risk level
colors = [color_map[risk] for risk in risk_levels]

# Abbreviate long condition names to fit 15 character limit
abbreviated_conditions = []
for condition in weather_conditions:
    if condition == "Uncomfortable Conditions":
        abbreviated_conditions.append("Uncomfortable")
    else:
        abbreviated_conditions.append(condition)

# For zero values, show a small bar but label correctly
display_probabilities = []
for prob in probabilities:
    if prob == 0:
        display_probabilities.append(0.5)  # Very small bar for visibility
    else:
        display_probabilities.append(prob)

# Create horizontal bar chart
fig = go.Figure(data=go.Bar(
    y=abbreviated_conditions,
    x=display_probabilities,
    orientation='h',
    marker_color=colors,
    text=[f"{prob}%" for prob in probabilities],
    textposition='outside',
    textfont=dict(size=11, color='black'),
    hovertemplate='%{y}: %{customdata}%<extra></extra>',
    customdata=probabilities
))

# Update layout with exact title as requested (keeping under 40 chars)
fig.update_layout(
    title="Weather Risk - July 4th NYC",
    xaxis_title="Probability (%)",
    yaxis_title="Conditions",
    xaxis=dict(range=[0, 35]),
    showlegend=False
)

# Update traces
fig.update_traces(cliponaxis=False)

# Save as both PNG and SVG
fig.write_image("weather_chart.png")
fig.write_image("weather_chart.svg", format="svg")