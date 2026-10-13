import { useState } from 'react';
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  Stack, TextField, Typography,
} from '@mui/material';
import ChoiceChips from './ChoiceChips.jsx';
import { createChild } from '../api/children.js';

const EMPTY_FORM = {
  name: '',
  dateOfBirth: '',
  gender: 'female',
  parentName: '',
  parentEmail: '',
  photo: '',
};
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GENDER_LABELS = { Girl: 'female', Boy: 'male', Other: 'other' };

export default function AddChildDialog({ open, onClose, onCreated }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  function setField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => { const next = { ...prev }; delete next[field]; return next; });
  }

  function validate() {
    const next = {};
    if (!form.name.trim()) next.name = 'Enter the child’s name';
    if (!form.dateOfBirth) next.dateOfBirth = 'Select the date of birth';
    else if (new Date(form.dateOfBirth) > new Date()) next.dateOfBirth = 'Date of birth cannot be in the future';
    if (!form.parentName.trim()) next.parentName = 'Enter the parent’s name';
    if (!EMAIL_PATTERN.test(form.parentEmail.trim())) next.parentEmail = 'Enter a valid email address';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleClose() {
    if (saving) return;
    setForm(EMPTY_FORM);
    setErrors({});
    setFormError('');
    onClose();
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');
    if (!validate()) return;
    setSaving(true);
    try {
      await createChild({
        ...form,
        name: form.name.trim(),
        parentName: form.parentName.trim(),
        parentEmail: form.parentEmail.trim().toLowerCase(),
      });
      setForm(EMPTY_FORM);
      onCreated();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Could not add child. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const genderLabel = Object.keys(GENDER_LABELS).find((key) => GENDER_LABELS[key] === form.gender);

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs" scroll="paper">
      <Box component="form" onSubmit={handleSubmit} noValidate sx={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <DialogTitle sx={{ pt: 2.5, pb: 1 }}>
          {/* Grab handle hints that this is a sheet on phones */}
          <Box sx={{ display: { xs: 'block', sm: 'none' }, width: 40, height: 4, borderRadius: 2, bgcolor: 'divider', mx: 'auto', mb: 1.5 }} />
          <Typography variant="h6" component="span">Add a child</Typography>
        </DialogTitle>

        <DialogContent sx={{ pt: '8px !important' }}>
          <Stack spacing={2}>
            {formError && <Alert severity="error">{formError}</Alert>}

            <TextField
              label="Child's full name"
              required fullWidth
              autoComplete="off"
              autoCapitalize="words"
              value={form.name}
              error={!!errors.name}
              helperText={errors.name}
              onChange={(e) => setField('name', e.target.value)}
            />
            <TextField
              label="Date of birth"
              type="date"
              required fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
              value={form.dateOfBirth}
              error={!!errors.dateOfBirth}
              helperText={errors.dateOfBirth}
              onChange={(e) => setField('dateOfBirth', e.target.value)}
            />
            <ChoiceChips
              label="Gender"
              options={Object.keys(GENDER_LABELS)}
              value={genderLabel}
              onChange={(label) => setField('gender', GENDER_LABELS[label])}
            />

            <TextField
              label="Parent's full name"
              required fullWidth
              autoComplete="off"
              autoCapitalize="words"
              value={form.parentName}
              error={!!errors.parentName}
              helperText={errors.parentName}
              onChange={(e) => setField('parentName', e.target.value)}
            />
            <TextField
              label="Parent's email"
              type="email"
              required fullWidth
              autoComplete="off"
              autoCapitalize="none"
              slotProps={{ htmlInput: { inputMode: 'email' } }}
              value={form.parentEmail}
              error={!!errors.parentEmail}
              helperText={errors.parentEmail || 'The daily report is sent here'}
              onChange={(e) => setField('parentEmail', e.target.value)}
            />
            <TextField
              label="Photo link (optional)"
              type="url"
              fullWidth
              autoComplete="off"
              slotProps={{ htmlInput: { inputMode: 'url' } }}
              value={form.photo}
              onChange={(e) => setField('photo', e.target.value)}
              placeholder="https://…"
            />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={handleClose} disabled={saving} size="large" sx={{ flex: 1 }}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" size="large" disabled={saving} sx={{ flex: 2 }}>
            {saving ? 'Adding…' : 'Add child'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
